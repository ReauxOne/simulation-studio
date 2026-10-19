// Traditional (public-domain) models. Fold lines are in the folded model's
// current coordinates; `move` is any point on the side that folds over.

const DIAMOND = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const SQUARE = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const H = 2 - Math.SQRT2; // 0.5858: where the cup's flaps land so their tops are level

export const MODELS = [
  {
    id: 'cat',
    name: 'Cat Face',
    difficulty: 1,
    paper: { shape: DIAMOND, front: '#fff4e6', back: '#f2994a' },
    riddle: 'Two pointy ears and a little chin.',
    fact: 'Cats can rotate their ears about 180 degrees.',
    face: { eyes: [[-0.22, -0.28], [0.22, -0.28]], nose: [0, -0.42], whiskers: true },
    steps: [
      { fold: [[-1, 0], [1, 0]], move: [0, 1], hint: 'Fold the top corner down to the bottom corner.' },
      { fold: [[0, -1], [-0.6, 0]], move: [-1, 0], hint: 'Fold the left corner up past the top edge to make an ear.' },
      { fold: [[0, -1], [0.6, 0]], move: [1, 0], hint: 'Do the same on the right.' },
      { fold: [[-1, -0.72], [1, -0.72]], move: [0, -1], hint: 'Fold the bottom tip up a little for the chin.' },
    ],
  },
  {
    id: 'dog',
    name: 'Puppy Face',
    difficulty: 1,
    paper: { shape: DIAMOND, front: '#7a4a2a', back: '#e9c79a' },
    riddle: 'Floppy ears and a button nose.',
    fact: 'A dog\'s nose print is as unique as a fingerprint.',
    face: { eyes: [[-0.17, -0.28], [0.17, -0.28]], nose: null },
    steps: [
      { fold: [[-1, 0], [1, 0]], move: [0, 1], hint: 'Fold the top corner down to the bottom corner.' },
      { fold: [[-0.4, 0], [-0.75, -0.25]], move: [-1, 0], hint: 'Fold the left corner down to make a floppy ear.' },
      { fold: [[0.4, 0], [0.75, -0.25]], move: [1, 0], hint: 'Same on the right.' },
      { fold: [[-1, -0.72], [1, -0.72]], move: [0, -1], layers: { top: 1 }, hint: 'Fold just the front layer\'s tip up. That\'s the nose.' },
      { fold: [[-1, -0.72], [1, -0.72]], move: [0, -1], type: 'mountain', hint: 'Fold the back tip behind.' },
    ],
  },
  {
    id: 'cup',
    name: 'Paper Cup',
    difficulty: 2,
    paper: { shape: DIAMOND, front: '#2bb3a3', back: '#f7fbfa' },
    riddle: 'It really holds water, at least for a minute.',
    fact: 'Folded paper cups were handed out at public drinking fountains in the early 1900s.',
    steps: [
      { fold: [[-1, 0], [1, 0]], move: [0, -1], hint: 'Fold the bottom corner up to the top corner.' },
      { fold: [[-(Math.SQRT2 - 1), H], [-H / 2, H / 2]], move: [-1, 0], hint: 'Fold the left corner across so its top edge is level.' },
      { fold: [[Math.SQRT2 - 1, H], [H / 2, H / 2]], move: [1, 0], hint: 'Fold the right corner across the same way.' },
      { fold: [[-1, H], [1, H]], move: [0, 1], layers: { top: 1 }, hint: 'Fold the front top flap down.' },
      { fold: [[-1, H], [1, H]], move: [0, 1], type: 'mountain', hint: 'Fold the back flap down behind. Open the cup!' },
    ],
  },
  {
    id: 'kabuto',
    name: 'Samurai Helmet',
    difficulty: 2,
    paper: { shape: DIAMOND, front: '#c0392b', back: '#f4d03f' },
    riddle: 'A traditional Japanese helmet, folded for Children\'s Day.',
    fact: 'Kabuto are folded in Japan for Children\'s Day on May 5.',
    steps: [
      { fold: [[-1, 0], [1, 0]], move: [0, 1], hint: 'Fold the top corner down to the bottom corner.' },
      { fold: [[0, 0], [-1, -1]], move: [-1, 0], hint: 'Fold the left corner down to the bottom point.' },
      { fold: [[0, 0], [1, -1]], move: [1, 0], hint: 'Fold the right corner down too. Now it\'s a diamond.' },
      { fold: [[-1, -0.5], [1, -0.5]], move: [0, -1], layers: { top: 2 }, hint: 'Fold both loose flaps up to the top point.' },
      { fold: [[-1, -0.62], [1, -0.62]], move: [0, -1], layers: { top: 1 }, hint: 'Fold the front bottom point up.' },
      { fold: [[-1, -0.5], [1, -0.5]], move: [0, -1], layers: { top: 2 }, hint: 'Fold that strip up again to make the brim.' },
      { fold: [[-1, -0.5], [1, -0.5]], move: [0, -1], type: 'mountain', hint: 'Fold the back point up behind.' },
    ],
  },
  {
    id: 'fortune',
    name: 'Fortune Teller',
    difficulty: 3,
    paper: { shape: SQUARE, front: '#e84393', back: '#fdf2f8' },
    riddle: 'Pick a color, pick a number…',
    fact: 'This model is also called a cootie catcher or salt cellar.',
    steps: [
      { fold: [[0, 1], [1, 0]], move: [1, 1], hint: 'Fold each corner to the center: top right…' },
      { fold: [[0, 1], [-1, 0]], move: [-1, 1], hint: '…top left…' },
      { fold: [[-1, 0], [0, -1]], move: [-1, -1], hint: '…bottom left…' },
      { fold: [[1, 0], [0, -1]], move: [1, -1], hint: '…and bottom right.' },
      { flip: true, hint: 'Turn it over.' },
      { fold: [[0.5, -1], [0.5, 1]], move: [1, 0], hint: 'Fold the corners to the center again: right…' },
      { fold: [[-0.5, -1], [-0.5, 1]], move: [-1, 0], hint: '…left…' },
      { fold: [[-1, 0.5], [1, 0.5]], move: [0, 1], hint: '…top…' },
      { fold: [[-1, -0.5], [1, -0.5]], move: [0, -1], hint: '…and bottom. Pinch it into shape to play!' },
    ],
  },
];
