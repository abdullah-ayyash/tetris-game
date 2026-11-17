// Canvas rendering. Reads game state, never changes it.
window.TetrisRender = (() => {
  const { COLS, ROWS, ROTATIONS } = window.TetrisEngine;
  const COLORS = { I: "#22d3ee", O: "#facc15", T: "#a78bfa", S: "#4ade80", Z: "#fb7185", J: "#60a5fa", L: "#fb923c" };
  const CELL = 30;
  const MINI = 24;
  const FLASH_MS = 220;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function prepare(canvas, w, h) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function block(ctx, x, y, size, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "rgba(255,255,255,.32)"; // light edge: top and left
    ctx.fillRect(x, y, size, size * 0.12);
    ctx.fillRect(x, y, size * 0.12, size);
    ctx.fillStyle = "rgba(0,0,0,.3)"; // shade: bottom and right
    ctx.fillRect(x, y + size * 0.88, size, size * 0.12);
    ctx.fillRect(x + size * 0.88, y, size * 0.12, size);
    ctx.globalAlpha = 1;
  }

  function mini(ctx, type, x0, y0, w, h, alpha = 1) {
    const cells = ROTATIONS[type].states[0];
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const pw = (Math.max(...xs) - minX + 1) * MINI, ph = (Math.max(...ys) - minY + 1) * MINI;
    const ox = x0 + (w - pw) / 2, oy = y0 + (h - ph) / 2;
    for (const [x, y] of cells) block(ctx, ox + (x - minX) * MINI, oy + (y - minY) * MINI, MINI, COLORS[type], alpha);
  }

  function create({ board, hold, next }) {
    const bctx = prepare(board, COLS * CELL, ROWS * CELL);
    const hctx = prepare(hold, 4 * MINI, 3 * MINI);
    const nctx = prepare(next, 4 * MINI, 9 * MINI);
    let flashes = [];

    function drawBoard(game, now) {
      bctx.fillStyle = "#0a0f1f";
      bctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      bctx.strokeStyle = "rgba(148,163,184,.08)";
      bctx.lineWidth = 1;
      bctx.beginPath();
      for (let x = 1; x < COLS; x++) { bctx.moveTo(x * CELL + .5, 0); bctx.lineTo(x * CELL + .5, ROWS * CELL); }
      for (let y = 1; y < ROWS; y++) { bctx.moveTo(0, y * CELL + .5); bctx.lineTo(COLS * CELL, y * CELL + .5); }
      bctx.stroke();

      game.board.forEach((row, y) => row.forEach((type, x) => type && block(bctx, x * CELL, y * CELL, CELL, COLORS[type])));

      if (game.piece && game.status !== "over") {
        const gy = game.ghostY();
        for (const [x, y] of game.cells({ ...game.piece, y: gy })) {
          if (y < 0) continue;
          bctx.strokeStyle = COLORS[game.piece.type];
          bctx.globalAlpha = 0.55;
          bctx.lineWidth = 2;
          bctx.strokeRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6);
          bctx.globalAlpha = 1;
        }
        for (const [x, y] of game.cells()) if (y >= 0) block(bctx, x * CELL, y * CELL, CELL, COLORS[game.piece.type]);
      }

      flashes = flashes.filter((f) => now - f.t < FLASH_MS);
      for (const f of flashes) {
        bctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - (now - f.t) / FLASH_MS)})`;
        for (const y of f.rows) bctx.fillRect(0, y * CELL, COLS * CELL, CELL);
      }
    }

    function drawSide(game) {
      hctx.clearRect(0, 0, 4 * MINI, 3 * MINI);
      if (game.holdType) mini(hctx, game.holdType, 0, 0, 4 * MINI, 3 * MINI, game.canHold ? 1 : 0.35);
      nctx.clearRect(0, 0, 4 * MINI, 9 * MINI);
      game.next(3).forEach((type, i) => mini(nctx, type, 0, i * 3 * MINI, 4 * MINI, 3 * MINI));
    }

    return {
      draw(game, now) { drawBoard(game, now); drawSide(game); },
      flash(rows, now) { flashes.push({ rows, t: now }); },
    };
  }

  return { create, COLORS };
})();
