# River to Cairo

A 3D Huckleberry Finn adventure built from the "Huck Game Prompt for Claude" design document.
Guide Huck, Jim and Tom from St. Petersburg down the Mississippi to Cairo, Illinois.

- **Play:** open `huck-finn.html` in a browser. It is one self-contained file (the three.js engine is inlined) and needs WebGL.
- **Controls:** WASD / arrows move (steer the raft on the river), Space or J attack, F special, Q or 1/2/3 switch character,
  E switch weapon, drag or Z / C turn the camera, P pause. Touch devices get on-screen buttons.

## Source

`huck-finn.html` is generated. Edit the files in `src/` and run `node build.js`.

| File | What it holds |
| --- | --- |
| `src/shell.html` | Page, styles, menus and the shared plumbing (input, audio, storage, game loop) |
| `src/core.js` | Characters, weapons, stage list, story flow, shared rules (damage, pickups, specials, hunger) |
| `src/land.js`, `src/river.js` | Rules for the town stages and the raft stages |
| `src/gfx.js` | 3D engine layer: lighting per time of day, sky, water, weather, and the model builders |
| `src/view-land.js`, `src/view-river.js` | Build each stage's 3D scene and keep it in step with the rules |
| `src/hud.js`, `src/main.js` | HUD, on-screen markers, camera dragging, update and render entry points |
| `src/vendor/three.min.js` | three.js r149 (MIT, see `THREE-LICENSE`) |

Testing shortcuts: add `#stage=3` to the URL to start at a later stage (1 to 5), and `&at=x,y` (land) or `&at=distance` (river) to start at a spot.
