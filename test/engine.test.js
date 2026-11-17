// Run with: node --test   (Node 20+). Tests the pure game rules only.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Game, COLS, ROWS, TYPES, ROTATIONS, gravityMs } = require("../js/engine.js");

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const playing = (type = "T") => {
  const g = new Game({ rng: seeded() });
  g.start();
  g.piece = { type, rot: 0, x: 3, y: 0 };
  return g;
};

test("7-bag: every window of 7 pieces holds each type exactly once", () => {
  const g = new Game({ rng: seeded(7) });
  const seen = [];
  for (let i = 0; i < 28; i++) { seen.push(g.next(1)[0]); g.queue.shift(); g._refill(); }
  for (let i = 0; i < 28; i += 7) assert.deepEqual([...seen.slice(i, i + 7)].sort(), [...TYPES].sort());
});

test("every piece has 4 cells in each of its 4 rotation states", () => {
  for (const type of TYPES) for (const cells of ROTATIONS[type].states) assert.equal(cells.length, 4);
});

test("four clockwise rotations return to the start", () => {
  for (const type of TYPES) {
    const g = playing(type); g.piece.y = 5;
    for (let i = 0; i < 4; i++) assert.ok(g.rotate(1), `${type} rotates`);
    assert.equal(g.piece.rot, 0);
  }
});

test("pieces cannot move through the walls", () => {
  const g = playing("I");
  for (let i = 0; i < 20; i++) g.moveLeft();
  assert.ok(g.cells().every(([x]) => x >= 0));
  for (let i = 0; i < 20; i++) g.moveRight();
  assert.ok(g.cells().every(([x]) => x < COLS));
});

test("rotation near a wall kicks instead of wrapping or failing", () => {
  const g = playing("I");
  g.piece = { type: "I", rot: 1, x: -2, y: 5 }; // vertical, in column 0
  assert.ok(g.rotate(1));
  assert.ok(g.cells().every(([x]) => x >= 0 && x < COLS));
});

test("rotation into a blocked space is refused and leaves the piece alone", () => {
  const g = playing("I");
  for (let y = 0; y < ROWS; y++) if (y !== 10) g.board[y].fill("O"); // a one-row-high corridor
  g.piece = { type: "I", rot: 0, x: 3, y: 9 }; // horizontal in row 10
  assert.ok(!g.collides(g.piece));
  const before = JSON.stringify(g.piece);
  assert.equal(g.rotate(1), false);
  assert.equal(JSON.stringify(g.piece), before);
});

test("single line clear scores 100 x level", () => {
  const g = playing("I");
  for (let x = 4; x < COLS; x++) g.board[19][x] = "O";
  g.piece = { type: "I", rot: 0, x: 0, y: 18 };
  g.hardDrop();
  assert.equal(g.lines, 1);
  assert.equal(g.score, 100);
  assert.ok(g.board[19].every((c) => c === null));
});

test("two adjacent full rows both clear (the original game missed the second)", () => {
  const g = playing("O");
  for (const y of [18, 19]) for (let x = 2; x < COLS; x++) g.board[y][x] = "I";
  g.piece = { type: "O", rot: 0, x: 0, y: 18 };
  g.hardDrop();
  assert.equal(g.lines, 2);
  assert.equal(g.score, 300);
  assert.ok(g.board.every((row) => row.every((c) => c === null)));
});

test("tetris clears four rows for 800 points", () => {
  const g = playing("I");
  for (let y = 16; y < ROWS; y++) for (let x = 1; x < COLS; x++) g.board[y][x] = "L";
  g.piece = { type: "I", rot: 1, x: -2, y: 14 }; // vertical in column 0
  g.hardDrop();
  assert.equal(g.lines, 4);
  assert.ok(g.score >= 800);
});

test("rows above a cleared line fall down intact", () => {
  const g = playing("I");
  for (let x = 4; x < COLS; x++) g.board[19][x] = "O";
  g.board[18][9] = "T";
  g.piece = { type: "I", rot: 0, x: 0, y: 18 };
  g.hardDrop();
  assert.equal(g.board[19][9], "T");
});

test("level rises every 10 lines and gravity speeds up", () => {
  const g = playing("I");
  g.lines = 9;
  for (let x = 4; x < COLS; x++) g.board[19][x] = "O";
  g.piece = { type: "I", rot: 0, x: 0, y: 18 };
  g.hardDrop();
  assert.equal(g.level, 2);
  assert.ok(gravityMs(2) < gravityMs(1));
  assert.equal(gravityMs(1), 1000);
});

test("hold swaps once per piece", () => {
  const g = playing("T");
  assert.ok(g.hold());
  assert.equal(g.holdType, "T");
  assert.ok(!g.hold(), "second hold before locking is refused");
  g.hardDrop();
  assert.ok(g.hold(), "allowed again after the piece locks");
});

test("soft drop scores 1 per row, hard drop 2 per row", () => {
  const g = playing("O");
  g.piece = { type: "O", rot: 0, x: 4, y: 0 };
  g.softDrop();
  assert.equal(g.score, 1);
  const rows = g.hardDrop();
  assert.equal(g.score, 1 + rows * 2);
});

test("ghost piece lands where a hard drop would", () => {
  const g = playing("T");
  const ghost = g.ghostY();
  const piece = { ...g.piece };
  g.hardDrop();
  assert.ok(g.cells({ ...piece, y: ghost }).every(([x, y]) => g.board[y][x] === "T"));
});

test("a piece that cannot spawn ends the game", () => {
  const g = new Game({ rng: seeded() });
  g.start();
  for (let y = 0; y < 2; y++) for (let x = 3; x < 7; x++) g.board[y][x] = "I"; // block the spawn area
  g.piece = { type: "O", rot: 0, x: 0, y: 10 };
  g.hardDrop(); // locks, then the next piece cannot enter
  assert.equal(g.status, "over");
});

test("input is ignored unless playing; pause freezes the game", () => {
  const g = new Game({ rng: seeded() });
  assert.equal(g.moveLeft(), false); // not started
  g.start();
  g.togglePause();
  const y = g.piece.y;
  g.tick(5000);
  assert.equal(g.piece.y, y);
  assert.equal(g.moveRight(), false);
  g.togglePause();
  g.tick(1000);
  assert.ok(g.piece.y > y);
});

test("a grounded piece locks after the lock delay, not instantly", () => {
  const g = playing("O");
  g.piece = { type: "O", rot: 0, x: 4, y: 18 };
  g.tick(100);
  assert.equal(g.piece.y, 18, "still movable");
  g.tick(500);
  assert.notEqual(g.board[19][4], null, "locked after the delay");
});

test("start() after game over resets everything", () => {
  const g = playing("T");
  g.score = 999; g.status = "over";
  g.start();
  assert.equal(g.score, 0);
  assert.equal(g.status, "playing");
});
