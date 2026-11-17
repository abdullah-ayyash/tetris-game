# Tetris

A playable Tetris in plain HTML, CSS and JavaScript, with a tested game engine, canvas rendering, keyboard and touch controls, and no dependencies.

**Live demo:** _add your GitHub Pages link here_

<!-- Add a screenshot or GIF here: docs/screenshot.png -->

## Features

- All 7 pieces with the **Super Rotation System**: clockwise and counter-clockwise rotation with proper wall kicks.
- **7-bag randomizer**, so you never wait forever for an I piece.
- **Hold**, **ghost piece**, a 3-piece **next queue**, **soft and hard drop**.
- Scoring for single, double, triple and Tetris clears, **levels** every 10 lines, and gravity that speeds up.
- **Lock delay**, so you can slide a piece into place at the last moment.
- **Pause**, game over, restart, and a **high score** saved in the browser.
- **Touch controls** for phones, keyboard auto-repeat (DAS/ARR) on desktop, and pause when the tab is hidden.
- Accessible: screen-reader announcements, focus management and reduced-motion support.

## Controls

| Key | Action |
| --- | ------ |
| ← → | Move |
| ↑ or X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| ↓ | Soft drop |
| Space | Hard drop |
| C or Shift | Hold |
| P or Esc | Pause |
| Enter | Start, resume or restart |

## How it is built

The rules and the screen are separate, which is what makes the logic testable.

```
js/engine.js   pure game rules (no DOM, no timers): board, pieces, rotation, scoring
js/render.js   canvas drawing, reads state only
js/input.js    keyboard and touch input with auto-repeat
js/main.js     game loop (requestAnimationFrame) and UI wiring
test/          unit tests for the engine
```

`engine.js` takes time as an argument (`tick(dt)`) and a random-number function, so tests are deterministic.

## Run it

Open `index.html` in a browser. No install and no build step.

## Tests (optional)

The engine has 18 unit tests covering rotation, wall kicks, line clears, scoring, levels, hold, pause and game over. They need Node 20+ and only run during development:

```bash
node --test test/engine.test.js
```

## Deploy

Settings → Pages → Deploy from a branch → `main` / `/ (root)`.

## What changed from the first version

The original game had several rule bugs, now fixed:

- Two or more completed rows at once were not all cleared.
- Rotating next to a wall or other blocks could wrap through them.
- New pieces inherited the previous piece's rotation.
- Only 5 of the 7 pieces existed (no S or J).
- Controls worked while paused or before starting, and could crash the game.
- There was no restart after game over, and game over overwrote the score.
- Resuming from pause re-rolled the next piece.
- Keys fired on release instead of press.

Fan-made project, not affiliated with or endorsed by The Tetris Company.
