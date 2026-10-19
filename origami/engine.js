// Fold Lab engine: simulates flat origami folds one step at a time.
//
// The paper is a list of flat, convex pieces. Each piece remembers its shape
// on the original (unfolded) sheet plus a 2D transform that places it in the
// folded model. A fold splits pieces along a line, then reflects the moving
// side across it. Because every piece keeps its "paper" coordinates, each
// fold also records real crease lines on the unfolded sheet, which is what
// the puzzle view draws.

const EPS = 1e-7;

// 2D affine transform [a, b, c, d, e, f]: x' = a*x + c*y + e, y' = b*x + d*y + f
export const IDENTITY = [1, 0, 0, 1, 0, 0];

export function apply(m, [x, y]) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function compose(A, B) {
  // A after B
  return [
    A[0] * B[0] + A[2] * B[1],
    A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3],
    A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4],
    A[1] * B[4] + A[3] * B[5] + A[5],
  ];
}

export function invert(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

export const det = (m) => m[0] * m[3] - m[1] * m[2];

function reflection(p, d) {
  const [dx, dy] = d;
  const r = [2 * dx * dx - 1, 2 * dx * dy, 2 * dx * dy, 2 * dy * dy - 1];
  const rp = [r[0] * p[0] + r[2] * p[1], r[1] * p[0] + r[3] * p[1]];
  return [r[0], r[1], r[2], r[3], p[0] - rp[0], p[1] - rp[1]];
}

function normalize([x, y]) {
  const l = Math.hypot(x, y);
  return [x / l, y / l];
}

// Clips a convex polygon to the side where (q - p) . n has the given sign.
function clip(poly, p, n, sign) {
  const out = [];
  const s = (q) => sign * ((q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1]);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = s(a), sb = s(b);
    if (sa >= -EPS) out.push(a);
    if ((sa > EPS && sb < -EPS) || (sa < -EPS && sb > EPS)) {
      const t = sa / (sa - sb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return dedupe(out);
}

function dedupe(poly) {
  const out = [];
  for (const q of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-9) out.push(q);
  }
  if (out.length > 1) {
    const f = out[0], l = out[out.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) <= 1e-9) out.pop();
  }
  return out;
}

function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

const side = (q, p, n) => (q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1];

export const folded = (piece) => piece.poly.map((q) => apply(piece.m, q));

function normalizeLayers(pieces) {
  const levels = [...new Set(pieces.map((p) => p.layer))].sort((a, b) => a - b);
  const map = new Map(levels.map((l, i) => [l, i]));
  for (const p of pieces) p.layer = map.get(p.layer);
}

function bounds(pieces) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pc of pieces) for (const [x, y] of folded(pc)) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function centroid(poly) {
  const n = poly.length;
  return [poly.reduce((s, q) => s + q[0], 0) / n, poly.reduce((s, q) => s + q[1], 0) / n];
}

function contains(poly, q) {
  const sgn = Math.sign(area(poly));
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (sgn * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) <= 1e-9) return false;
  }
  return true;
}

// Picks which of the pieces touching the moving side actually fold. Layer
// numbers are a global stacking order, so "top" is judged locally: a piece is
// in the top n if fewer than n other layers lie above it at that spot.
function selectLayers(candidates, layers, a, n) {
  if (!layers || layers === 'all') return candidates;
  const want = layers.top || layers.bottom;
  const shapes = new Map(candidates.map((p) => [p, folded(p)]));
  return candidates.filter((p) => {
    // Sample the moving part at its center and toward each corner and edge
    // midpoint, then count how many layers are stacked over the deepest spot.
    const part = clip(shapes.get(p), a, n, 1);
    const c = centroid(part);
    const toward = (v) => [c[0] + 0.7 * (v[0] - c[0]), c[1] + 0.7 * (v[1] - c[1])];
    const samples = [c];
    part.forEach((v, i) => {
      const w = part[(i + 1) % part.length];
      samples.push(toward(v), toward([(v[0] + w[0]) / 2, (v[1] + w[1]) / 2]));
    });
    const others = candidates.filter((o) => (layers.top ? o.layer > p.layer : o.layer < p.layer));
    const deepest = Math.max(...samples.map((q) =>
      new Set(others.filter((o) => contains(shapes.get(o), q)).map((o) => o.layer)).size));
    return deepest < want;
  });
}

let nextId = 1;

// A step is one of:
//   { fold: [[x1, y1], [x2, y2]], move: [x, y], type: 'valley' | 'mountain', layers?: 'all' | {top: n} | {bottom: n} }
//     The line is in folded-model coordinates; `move` is any point on the side that folds over.
//   { flip: true }  turn the whole model over left to right.
function runStep(pieces, step) {
  if (step.flip) {
    const b = bounds(pieces);
    const cx = (b.minX + b.maxX) / 2;
    const p = [cx, 0], d = [0, 1];
    const R = reflection(p, d);
    const max = Math.max(...pieces.map((pc) => pc.layer));
    const prep = pieces.map((pc) => ({ ...pc, moving: true }));
    const after = pieces.map((pc) => ({ ...pc, m: compose(R, pc.m), layer: max - pc.layer }));
    return { prep, after, axis: { p, d, n: [1, 0] }, sign: 1, creases: [] };
  }

  const [a, b] = step.fold;
  const d = normalize([b[0] - a[0], b[1] - a[1]]);
  let n = [-d[1], d[0]];
  if (side(step.move, a, n) < 0) n = [-n[0], -n[1]];

  // Pieces with any area on the moving side.
  const touching = pieces.filter((pc) => folded(pc).some((q) => side(q, a, n) > 1e-6));
  const selected = new Set(selectLayers(touching, step.layers, a, n));

  const prep = [];
  const creases = [];
  const valley = step.type !== 'mountain';
  for (const pc of pieces) {
    if (!selected.has(pc)) { prep.push({ ...pc, moving: false }); continue; }
    const F = folded(pc);
    const inv = invert(pc.m);
    const pos = clip(F, a, n, 1);
    const neg = clip(F, a, n, -1);
    const hasPos = pos.length >= 3 && Math.abs(area(pos)) > 1e-9;
    const hasNeg = neg.length >= 3 && Math.abs(area(neg)) > 1e-9;
    if (hasPos && !hasNeg) { prep.push({ ...pc, moving: true }); continue; }
    if (!hasPos) { prep.push({ ...pc, moving: false }); continue; }
    prep.push({ ...pc, id: nextId++, poly: neg.map((q) => apply(inv, q)), moving: false });
    prep.push({ ...pc, id: nextId++, poly: pos.map((q) => apply(inv, q)), moving: true });
    // The crease is the part of the fold line that lies inside this piece.
    const onLine = pos.filter((q) => Math.abs(side(q, a, n)) < 1e-6);
    if (onLine.length >= 2) {
      const flipped = det(pc.m) < 0;
      // A valley seen from above is a valley on the sheet's front only if this piece is face-up.
      const kind = valley !== flipped ? 'V' : 'M';
      creases.push({ a: apply(inv, onLine[0]), b: apply(inv, onLine[onLine.length - 1]), kind });
    }
  }

  const R = reflection(a, d);
  const moving = prep.filter((pc) => pc.moving);
  const all = prep.map((pc) => pc.layer);
  const maxAll = Math.max(...all), minAll = Math.min(...all);
  const maxMoved = Math.max(...moving.map((pc) => pc.layer));
  const minMoved = Math.min(...moving.map((pc) => pc.layer));
  const after = prep.map((pc) => {
    const { moving: mv, ...rest } = pc;
    if (!mv) return rest;
    const layer = valley
      ? maxAll + 1 + (maxMoved - pc.layer)
      : minAll - 1 - (pc.layer - minMoved);
    return { ...rest, m: compose(R, pc.m), layer };
  });
  normalizeLayers(after);

  // Rotation sign so a valley lifts the moving side toward the viewer (+z).
  const k = d[0] * n[1] - d[1] * n[0];
  const sign = (valley ? 1 : -1) * Math.sign(k);
  return { prep, after, axis: { p: a, d, n }, sign, creases };
}

export function simulate(model) {
  const sheet = model.paper.shape;
  let pieces = [{ id: nextId++, poly: sheet, m: IDENTITY, layer: 0 }];
  const states = [pieces];
  const steps = [];
  const creases = [];
  for (const step of model.steps) {
    const r = runStep(pieces, step);
    steps.push({ ...r, step, creasesSoFar: [...creases, ...r.creases] });
    creases.push(...r.creases);
    pieces = r.after;
    states.push(pieces);
  }
  return { sheet, states, steps, creases };
}
