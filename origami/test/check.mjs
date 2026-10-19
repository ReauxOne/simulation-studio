// Quick sanity check: runs every model and prints each step's result.
// Usage: node origami/test/check.mjs
import { simulate, folded } from '../engine.js';
import { MODELS } from '../models.js';

const r = (v) => Math.round(v * 100) / 100;
let failed = 0;
for (const model of MODELS) {
  const sim = simulate(model);
  console.log(`\n== ${model.name}: ${sim.creases.length} crease segments`);
  sim.steps.forEach((s, i) => {
    const pcs = sim.states[i + 1];
    const pts = pcs.flatMap(folded);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const moved = s.prep.filter((p) => p.moving).length;
    const layers = Math.max(...pcs.map((p) => p.layer)) + 1;
    console.log(`  ${i + 1}. moved ${moved}/${s.prep.length} pieces, ${layers} layers, ` +
      `x ${r(Math.min(...xs))}..${r(Math.max(...xs))}, y ${r(Math.min(...ys))}..${r(Math.max(...ys))}`);
    if (moved === 0) { console.log('     !! nothing moved'); failed++; }
  });
  // Paper area must be conserved (pieces tile the sheet).
  const area = (poly) => Math.abs(poly.reduce((s, a, i) => {
    const b = poly[(i + 1) % poly.length]; return s + a[0] * b[1] - b[0] * a[1];
  }, 0) / 2);
  const total = sim.states.at(-1).reduce((s, p) => s + area(p.poly), 0);
  const sheet = area(model.paper.shape);
  if (Math.abs(total - sheet) > 1e-6) { console.log(`  !! area ${total} vs sheet ${sheet}`); failed++; }
}
process.exit(failed ? 1 : 0);
