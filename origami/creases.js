// Draws a model's crease pattern on a 2D canvas, using the creases the
// engine recorded. Valleys are dashed blue, mountains dash-dot red.

export const VALLEY = '#2563eb';
export const MOUNTAIN = '#dc2626';

// box: {x, y, size} in canvas pixels. opts:
//   upTo: draw creases from steps 0..upTo (fractional = the last one grows in)
//   highlight: Set of step indexes to emphasize and number
export function drawCreasePattern(ctx, sim, model, box, { upTo = Infinity, highlight = new Set(), paper = '#fffdf8', scale = 1 } = {}) {
  const xs = sim.sheet.map((p) => p[0]), ys = sim.sheet.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  const k = box.size / span;
  const ox = box.x + (box.size - (maxX - minX) * k) / 2;
  const oy = box.y + (box.size - (maxY - minY) * k) / 2;
  const P = ([x, y]) => [ox + (x - minX) * k, oy + (maxY - y) * k];

  ctx.save();
  ctx.lineCap = 'round';
  // Sheet
  ctx.beginPath();
  sim.sheet.forEach((q, i) => (i ? ctx.lineTo(...P(q)) : ctx.moveTo(...P(q))));
  ctx.closePath();
  ctx.shadowColor = 'rgba(40,30,20,0.18)';
  ctx.shadowBlur = 18 * scale;
  ctx.shadowOffsetY = 6 * scale;
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = model.paper.front;
  ctx.stroke();

  const labels = [];
  sim.steps.forEach((s, i) => {
    if (i > upTo) return;
    const grow = Math.min(1, upTo - i + 1);
    const hot = highlight.has(i);
    for (const c of s.creases) {
      const a = P(c.a), b0 = P(c.b);
      const b = [a[0] + (b0[0] - a[0]) * grow, a[1] + (b0[1] - a[1]) * grow];
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.strokeStyle = c.kind === 'V' ? VALLEY : MOUNTAIN;
      ctx.globalAlpha = highlight.size && !hot ? 0.35 : 1;
      ctx.lineWidth = (hot ? 4.5 : 2.6) * scale;
      ctx.setLineDash(c.kind === 'V' ? [10 * scale, 7 * scale] : [14 * scale, 5 * scale, 2 * scale, 5 * scale]);
      ctx.stroke();
    }
    if (hot && s.creases.length) {
      // Label the longest segment of this step.
      const c = s.creases.reduce((m, c) => (dist(c) > dist(m) ? c : m));
      const a = P(c.a), b = P(c.b);
      labels.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, n: i + 1 });
    }
  });
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  for (const l of labels) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, 13 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#1f1b16';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${14 * scale}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(l.n), l.x, l.y + 0.5);
  }
  ctx.restore();
}

const dist = (c) => Math.hypot(c.a[0] - c.b[0], c.a[1] - c.b[1]);
