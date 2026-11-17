// Pure Tetris rules: no DOM, no timers. Works in the browser and in Node (for tests).
(function (root) {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const LOCK_DELAY = 500;      // ms a grounded piece may sit before locking
  const MAX_LOCK_RESETS = 15;  // moves/rotations that can postpone locking
  const LINE_POINTS = [0, 100, 300, 500, 800];

  // Shapes as drawn in their spawn orientation ("X" = filled).
  const SHAPES = {
    I: ["....", "XXXX", "....", "...."],
    O: ["XX", "XX"],
    T: [".X.", "XXX", "..."],
    S: [".XX", "XX.", "..."],
    Z: ["XX.", ".XX", "..."],
    J: ["X..", "XXX", "..."],
    L: ["..X", "XXX", "..."],
  };
  const TYPES = Object.keys(SHAPES);

  // Precompute the four rotation states of every piece (rotate clockwise: (x, y) -> (n-1-y, x)).
  const ROTATIONS = {};
  for (const type of TYPES) {
    const rows = SHAPES[type];
    const size = rows.length;
    let cells = [];
    rows.forEach((row, y) => [...row].forEach((c, x) => c === "X" && cells.push([x, y])));
    const states = [cells];
    for (let r = 1; r < 4; r++) {
      cells = cells.map(([x, y]) => [size - 1 - y, x]);
      states.push(cells);
    }
    ROTATIONS[type] = { size, states };
  }

  // Super Rotation System wall kicks, written y-up as in the guideline and flipped on use.
  const KICKS_JLSTZ = {
    "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],    "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  };
  const KICKS_I = {
    "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  };

  /** Milliseconds per row of gravity at a level (guideline curve, never faster than 50 ms). */
  function gravityMs(level) {
    return Math.max(50, 1000 * Math.pow(0.8 - (level - 1) * 0.007, level - 1));
  }

  class Game {
    /** @param {{rng?: () => number, onEvent?: (type: string, data?: object) => void}} opts */
    constructor(opts = {}) {
      this.rng = opts.rng || Math.random;
      this.onEvent = opts.onEvent || (() => {});
      this.reset();
    }

    reset() {
      this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.status = "ready"; // ready | playing | paused | over
      this.queue = [];
      this.holdType = null;
      this.canHold = true;
      this.piece = null;
      this.gravity = 0;
      this.lockTimer = 0;
      this.lockResets = 0;
      this.lowestY = -Infinity;
      this._refill();
    }

    start() {
      this.reset();
      this.status = "playing";
      this._spawn();
      this._emit("start");
    }

    togglePause() {
      if (this.status === "playing") this.status = "paused";
      else if (this.status === "paused") this.status = "playing";
      else return;
      this._emit(this.status === "paused" ? "pause" : "resume");
    }

    pause() { if (this.status === "playing") this.togglePause(); }

    /** Upcoming piece types. */
    next(count = 3) { this._refill(); return this.queue.slice(0, count); }

    cells(p = this.piece) {
      return ROTATIONS[p.type].states[p.rot].map(([cx, cy]) => [p.x + cx, p.y + cy]);
    }

    collides(p) {
      return this.cells(p).some(([x, y]) =>
        x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x] !== null));
    }

    ghostY() {
      const g = { ...this.piece };
      while (!this.collides({ ...g, y: g.y + 1 })) g.y++;
      return g.y;
    }

    moveLeft() { return this._shift(-1); }
    moveRight() { return this._shift(1); }

    /** Rotate clockwise (dir = 1) or counter-clockwise (dir = -1), trying SRS wall kicks. */
    rotate(dir = 1) {
      if (this.status !== "playing") return false;
      const from = this.piece.rot;
      const to = (from + dir + 4) % 4;
      const table = this.piece.type === "I" ? KICKS_I : this.piece.type === "O" ? null : KICKS_JLSTZ;
      const kicks = table ? table[`${from}>${to}`] : [[0, 0]];
      for (const [dx, dy] of kicks) {
        const test = { ...this.piece, rot: to, x: this.piece.x + dx, y: this.piece.y - dy };
        if (!this.collides(test)) {
          this.piece = test;
          this._afterMove();
          return true;
        }
      }
      return false;
    }

    /** Move down one row (player-controlled, +1 point). */
    softDrop() {
      if (this.status !== "playing") return false;
      if (!this._tryMove(0, 1)) return false;
      this.score += 1;
      this._afterDescent();
      return true;
    }

    /** Drop to the bottom and lock immediately (+2 points per row). */
    hardDrop() {
      if (this.status !== "playing") return 0;
      let rows = 0;
      while (this._tryMove(0, 1)) rows++;
      this.score += rows * 2;
      this._lock();
      return rows;
    }

    /** Swap the falling piece with the held one (once per piece). */
    hold() {
      if (this.status !== "playing" || !this.canHold) return false;
      const previous = this.holdType;
      this.holdType = this.piece.type;
      this._spawn(previous || undefined);
      this.canHold = false;
      this._emit("hold");
      return true;
    }

    /** Advance gravity and lock delay by dt milliseconds. */
    tick(dt) {
      if (this.status !== "playing") return;
      if (this._grounded()) {
        this.lockTimer += dt;
        if (this.lockTimer >= LOCK_DELAY) this._lock();
        return;
      }
      this.gravity += dt;
      const step = gravityMs(this.level);
      while (this.gravity >= step && this.status === "playing") {
        this.gravity -= step;
        if (!this._tryMove(0, 1)) break;
        this._afterDescent();
        if (this._grounded()) { this.gravity = 0; break; }
      }
    }

    // ---- internals ----

    _emit(type, data) { this.onEvent(type, data); }

    _refill() {
      while (this.queue.length < 7) {
        const bag = [...TYPES];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.rng() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        this.queue.push(...bag);
      }
    }

    _spawn(type) {
      const t = type || this.queue.shift();
      this._refill();
      this.piece = { type: t, rot: 0, x: Math.floor((COLS - ROTATIONS[t].size) / 2), y: t === "I" ? -1 : 0 };
      this.gravity = 0;
      this.lockTimer = 0;
      this.lockResets = 0;
      this.lowestY = this.piece.y;
      if (this.collides(this.piece)) this._gameOver();
    }

    _gameOver() {
      this.status = "over";
      this._emit("over", { score: this.score, lines: this.lines, level: this.level });
    }

    _tryMove(dx, dy) {
      const next = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
      if (this.collides(next)) return false;
      this.piece = next;
      return true;
    }

    _grounded() { return this.collides({ ...this.piece, y: this.piece.y + 1 }); }

    _shift(dx) {
      if (this.status !== "playing") return false;
      if (!this._tryMove(dx, 0)) return false;
      this._afterMove();
      return true;
    }

    // Moving or rotating while grounded postpones locking, up to a limit.
    _afterMove() {
      if (this._grounded() && this.lockResets < MAX_LOCK_RESETS) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    }

    _afterDescent() {
      this.lockTimer = 0;
      this.gravity = 0;
      if (this.piece.y > this.lowestY) { this.lowestY = this.piece.y; this.lockResets = 0; }
    }

    _lock() {
      const cells = this.cells();
      if (cells.some(([, y]) => y < 0)) return this._gameOver(); // locked above the board
      for (const [x, y] of cells) this.board[y][x] = this.piece.type;

      const full = [];
      this.board.forEach((row, y) => row.every((c) => c !== null) && full.push(y));
      if (full.length) {
        // Remove every full row in one pass, so double/triple/tetris clears all count.
        this.board = this.board.filter((_, y) => !full.includes(y));
        while (this.board.length < ROWS) this.board.unshift(Array(COLS).fill(null));
        this.score += LINE_POINTS[full.length] * this.level;
        this.lines += full.length;
        const level = Math.floor(this.lines / 10) + 1;
        const leveledUp = level > this.level;
        this.level = level;
        this._emit("clear", { rows: full, count: full.length, level });
        if (leveledUp) this._emit("level", { level });
      } else {
        this._emit("lock");
      }
      this.canHold = true;
      this._spawn();
    }
  }

  const api = { Game, COLS, ROWS, TYPES, ROTATIONS, SHAPES, LOCK_DELAY, gravityMs, LINE_POINTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TetrisEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
