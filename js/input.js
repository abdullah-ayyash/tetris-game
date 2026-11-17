// Keyboard and touch input with auto-repeat (DAS/ARR) for left, right and down.
window.TetrisInput = (() => {
  const KEYS = {
    ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", KeyX: "rotate",
    KeyZ: "rotateCCW", Space: "drop", KeyC: "hold", ShiftLeft: "hold", ShiftRight: "hold", KeyP: "pause", Escape: "pause",
  };

  function create(game, { onTogglePause, onPrimary }) {
    const actions = {
      left: { fire: () => game.moveLeft(), das: 150, arr: 45 },
      right: { fire: () => game.moveRight(), das: 150, arr: 45 },
      down: { fire: () => game.softDrop(), das: 45, arr: 45 },
      rotate: { fire: () => game.rotate(1) },
      rotateCCW: { fire: () => game.rotate(-1) },
      drop: { fire: () => game.hardDrop() },
      hold: { fire: () => game.hold() },
      pause: { fire: () => onTogglePause() },
    };
    const held = new Map(); // action -> { t, repeating }

    function press(name) {
      const a = actions[name];
      if (!a || held.has(name)) return;
      if (name === "left") held.delete("right");
      if (name === "right") held.delete("left");
      a.fire();
      if (a.arr) held.set(name, { t: 0, repeating: false });
    }
    const release = (name) => held.delete(name);

    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Enter") {
        if (game.status !== "playing") { e.preventDefault(); onPrimary(); }
        return;
      }
      const name = KEYS[e.code];
      if (!name) return;
      e.preventDefault(); // only for keys the game uses
      if (!e.repeat) press(name);
    });
    document.addEventListener("keyup", (e) => { const n = KEYS[e.code]; if (n) release(n); });
    window.addEventListener("blur", () => held.clear());

    // On-screen buttons
    document.querySelectorAll("[data-act]").forEach((btn) => {
      const name = btn.dataset.act;
      btn.addEventListener("pointerdown", (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch { /* no active pointer */ }
        press(name); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => btn.addEventListener(ev, () => release(name)));
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
    });

    return {
      update(dt) {
        if (game.status !== "playing") return;
        for (const [name, h] of held) {
          const a = actions[name];
          h.t += dt;
          const wait = h.repeating ? a.arr : a.das;
          while (h.t >= wait) { h.t -= wait; h.repeating = true; a.fire(); }
        }
      },
      clear() { held.clear(); },
    };
  }
  return { create };
})();
