# Simulation Studio: Project Notes

*Started October 18, 2026*

## The idea

A collection of small, fun simulations, starting with origami. The first product, **Fold Lab**, offers one origami fold a day as a small, calming break away from screens.

Kept separate from CurioKidsCrew on purpose. This is its own tool, and it can grow into other kinds of simulations later.

### What makes it different

- **Puzzle mode.** Instead of walking people through every step, show them the crease lines and let them work it out, like a puzzle. Short, readable hints are there if they get stuck.
- **Short-form videos.** Good-looking 3D folding animations can become Reels, Shorts and TikToks to share and grow an audience.
- **A daily habit.** One fold a day, a streak counter, and folds that get harder over time.

## Initial assessment

**Strengths**
- Easy to keep up with: one sheet of paper and 5 to 15 minutes.
- A screen-light activity, which appeals to parents and to people who want a calm break.
- Visible progress, from easy folds up to cranes, modular boxes and tessellations.

**Challenges**
- **Making the content.** Each fold needs clear instructions, and a year's worth is a lot of work. The folding engine helps because it generates the crease pattern and animation from one model definition.
- **Copyright on designs.** Traditional models (crane, cup, kabuto, fortune teller, etc.) are public domain. Many modern designs belong to their creators, so start with traditional models and license or partner with designers later.
- **Making money.** A fold-a-day app alone is hard to charge for. Better options:
  - Monthly paper kits matched to that month's folds (app free, kit paid)
  - Classroom and homeschool packs
  - Optional premium: advanced folds, printables
  - Growing an audience through short-form video content

## Research: open-source origami tools

Found while researching origami apps. No open-source project offers a ready-made library of step-by-step folds, but several tools are useful:

| Tool | What it does | License | Notes |
|---|---|---|---|
| [Origami Simulator](https://github.com/amandaghassaei/OrigamiSimulator) by Amanda Ghassaei ([origamisimulator.org](https://origamisimulator.org)) | Folds a whole crease pattern at once in the browser, with a 0–100% fold slider and strain coloring | **MIT** (confirmed on her GitHub) | Free to use, even commercially, with credit. Good for "watch it fold" previews of crease patterns. Folds everything at once, not step by step. |
| [Origami Editor 3D](https://sourceforge.net/p/origamieditor3d/) | Desktop app that records a step-by-step folding sequence and exports PDF diagrams or animated GIFs | GPL-3.0 | Fine for **making** content (exported files are yours). |
| [Rabbit Ear](https://github.com/rabbit-ear/rabbit-ear) | JavaScript library for modeling and drawing origami, using the FOLD format | GPL-3.0 | GPL means an app that includes it would also need to be GPL. |
| [origami-diagrams](https://www.npmjs.org/package/origami-diagrams) | Turns a FOLD file with an ordered list of steps into diagrams | Not confirmed | Worth a closer look. |
| [Oriedita](https://github.com/oriedita/oriedita) | Crease pattern editor that checks flat-foldability, supports FOLD | Not confirmed | A design tool. |
| [ORIPA](https://mitani.cs.tsukuba.ac.jp/oripa) | Crease pattern editor that shows the folded shape | GPL | A design tool. |

**FOLD format:** an open standard for origami data. It can hold an ordered list of steps (`file_frames`), so a whole step-by-step fold can live in one file. It's a good candidate for importing and exporting models later.

**License note:** MIT code can go into any app with credit. GPL code makes the whole app GPL if it's included. Using a GPL *tool* only to create images or diagrams doesn't affect the app. (General rule, not legal advice.)

## Decision: build our own folding engine

Rather than depending on a library, Fold Lab has its own small engine (`origami/engine.js`):
- The paper is a set of flat pieces. Each fold splits pieces along a line and flips the moving side over.
- Every piece remembers where it sits on the unfolded sheet, so **the crease pattern is generated from the real folds**. The puzzle view, the hints and the 3D animation all come from one model definition.
- No licensing restrictions: it's all our own code.

## What's built (version 1)

- **5 traditional models:** Cat Face, Puppy Face, Paper Cup, Samurai Helmet (kabuto), Fortune Teller
- **Puzzle mode:** crease pattern (blue dashed = valley, red dash-dot = mountain), finished 3D model, hints revealed one at a time with the matching crease highlighted
- **Step by step:** 3D fold animations with play, pause, a slider, and clickable steps
- **Fold of the day** that changes daily, plus an "I folded it!" streak counter
- **Short video maker:** vertical 9:16 clip of about 20 seconds (title, "Can you fold this?" crease puzzle, captioned folds, "Your turn!" ending) that records to a downloadable file

See [README.md](README.md) for how to run it and how the code is organized.

### Known limits and to-dos

- Only simple flat folds. Squash, inside-reverse and sink folds aren't supported yet, so no crane.
- The finished model stays flat (no 3D shaping, e.g. opening the cup or popping the fortune teller).
- Video recording is untested to the end: it needs the page visible while recording. Try **Make a short video → Record** in a normal browser window.
- Streaks are saved only in the current browser.
- Needs an internet connection for Three.js and fonts.

## Ideas and roadmap

**Next for Fold Lab**
- Add squash and reverse folds to unlock the crane, the frog and the water bomb
- Grow the library toward 30+ models with a difficulty progression
- Kabuto horns, plus a few more "face" models (fox, pig, bear)
- Optional crease-pattern-only "expert puzzles" (tessellations), with Origami Simulator (MIT) for the preview
- Import and export FOLD files
- Video options: different backgrounds, music, branded intro and outro, batch export for a week of content
- Printable crease patterns to fold along

**Beyond origami (Simulation Studio)**
- Other playful simulations that work as daily puzzles or short videos, for example paper engineering and pop-ups, knots, tangrams, marble runs, or kinetic sand patterns

**Business**
- Test interest by posting the short videos first, before building more
- Paper kit subscription matched to the month's folds
- Classroom and homeschool packs
