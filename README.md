# Simulation Studio

A home for small, playful simulations. First up: **Fold Lab**, an origami fold-a-day app.

The idea, research, decisions and roadmap are in [PROJECT_NOTES.md](PROJECT_NOTES.md).

## Fold Lab (`origami/`)

- **Puzzle mode:** see the crease pattern (blue dashed = valley, red dash-dot = mountain) and the finished model in 3D. Try to fold it yourself; reveal hints one at a time.
- **Step by step:** watch each fold animate in 3D. Scrub, pause, or click any step.
- **Short video:** makes a vertical 9:16 clip (title, crease puzzle, captioned folds, outro) and records it to a downloadable file for Reels / Shorts / TikTok.
- **Fold of the day + streaks:** the model rotates daily; "I folded it!" tracks your streak in this browser.

### Run it

```bash
python3 -m http.server 8765 --directory "origami"
```

Then open http://localhost:8765. (It needs an internet connection to load Three.js and fonts.)

### How it works

- `engine.js` simulates flat folds. The paper is a set of flat pieces; each fold splits pieces along a line and reflects the moving side. Every piece remembers where it sits on the unfolded sheet, so the crease pattern is generated from the actual folds.
- `models.js` defines the models: each step is a fold line, a point on the side that moves, valley/mountain, an optional "top layers only", and a one-line hint.
- `render3d.js` draws the pieces with Three.js and animates each fold as a rotation.
- `creases.js` draws the crease pattern; `video.js` composes and records the short video.
- `node origami/test/check.mjs` checks every model folds cleanly (no empty steps, paper area preserved).

### Adding a model

Copy an entry in `models.js`, change the steps, and run the check. Fold lines are written in the model's current (already folded) coordinates; the paper starts as a square from -1 to 1 (or a diamond).

### Limits (for now)

- Flat folds only: no squash, reverse, or sink folds, and no 3D shaping (so no crane yet).
- Open-source tools that could extend this: Amanda Ghassaei's Origami Simulator (MIT) for full crease-pattern folding, and the FOLD file format for importing patterns.
