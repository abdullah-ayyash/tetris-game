// Wires the engine, renderer, input and UI together.
(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    board: $("board"), hold: $("hold"), next: $("next"), score: $("score"), best: $("best"), level: $("level"), lines: $("lines"),
    overlay: $("overlay"), title: $("ov-title"), text: $("ov-text"), btn: $("ov-btn"), status: $("status"),
  };
  const BEST_KEY = "tetris:best";
  const store = {
    get: () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } },
    set: (v) => { try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* storage unavailable */ } },
  };
  let best = store.get();
  let newBest = false;

  const renderer = TetrisRender.create({ board: el.board, hold: el.hold, next: el.next });
  const announce = (msg) => { el.status.textContent = msg; };

  const game = new TetrisEngine.Game({
    onEvent(type, data) {
      if (type === "clear") {
        renderer.flash(data.rows, performance.now());
        announce(`${["", "Single", "Double", "Triple", "Tetris"][data.count]}. Score ${game.score}.`);
      }
      if (type === "level") announce(`Level ${data.level}`);
      if (type === "over") {
        newBest = game.score > best;
        if (newBest) { best = game.score; store.set(best); }
        input.clear();
        showOverlay("Game over", `Score ${game.score.toLocaleString()}${newBest ? " – new best!" : ""}`, "Play again");
        announce(`Game over. Score ${game.score}.`);
      }
      if (type === "pause") showOverlay("Paused", "Take a breather.", "Resume");
      if (type === "resume" || type === "start") hideOverlay();
    },
  });

  const input = TetrisInput.create(game, {
    onTogglePause: () => game.togglePause(),
    onPrimary: () => (game.status === "paused" ? game.togglePause() : game.start()),
  });

  function showOverlay(title, text, label) {
    el.title.textContent = title;
    el.text.textContent = text;
    el.btn.textContent = label;
    el.overlay.hidden = false;
    el.btn.focus({ preventScroll: true });
  }
  function hideOverlay() { el.overlay.hidden = true; el.btn.blur(); }

  el.btn.addEventListener("click", () => (game.status === "paused" ? game.togglePause() : game.start()));
  document.addEventListener("visibilitychange", () => document.hidden && game.pause());

  const cache = {};
  function setText(key, node, value) {
    if (cache[key] !== value) { cache[key] = value; node.textContent = value; }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(now - last, 100); // clamp so a background tab can't cause a huge fall
    last = now;
    input.update(dt);
    game.tick(dt);
    renderer.draw(game, now);
    setText("score", el.score, game.score.toLocaleString());
    setText("best", el.best, Math.max(best, game.score).toLocaleString());
    setText("level", el.level, String(game.level));
    setText("lines", el.lines, String(game.lines));
    requestAnimationFrame(frame);
  }

  showOverlay("Tetris", "Clear lines, chase the high score.", "Start game");
  requestAnimationFrame(frame);
})();
