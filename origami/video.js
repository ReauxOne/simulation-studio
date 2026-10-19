// Builds a vertical 9:16 short-form video of a fold: title card, the crease
// pattern as a puzzle, the folding animation with captions, and an outro.
// Frames are drawn on a 2D canvas (3D render + text), which MediaRecorder captures.
import { FoldView } from './render3d.js';
import { drawCreasePattern, VALLEY, MOUNTAIN } from './creases.js';

const W = 720, H = 1280;
const $ = (id) => document.getElementById(id);

function timeline(sim) {
  const segs = [{ kind: 'intro', dur: 2.4 }, { kind: 'pattern', dur: 3.8 }];
  sim.steps.forEach((s, i) => segs.push({ kind: 'fold', i, dur: s.step.flip ? 1.7 : 2.3 }));
  segs.push({ kind: 'outro', dur: 3.4 });
  let t = 0;
  for (const s of segs) { s.start = t; t += s.dur; }
  return { segs, total: t };
}

function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * k);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function text(ctx, str, x, y, { size = 40, weight = 600, family = 'Inter', color = '#221d17', align = 'center', alpha = 1, spacing = 0, maxWidth = W - 120, lineHeight = 1.25 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family === 'Fraunces' ? 'Fraunces, Georgia, serif' : 'Inter, system-ui, sans-serif'}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  const lines = wrap(ctx, str, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lineHeight));
  ctx.restore();
  return lines.length * size * lineHeight;
}

const fade = (t, dur, edge = 0.35) => Math.min(1, t / edge, (dur - t) / edge);
const stepKind = (step) => (step.flip ? 'TURN OVER' : step.type === 'mountain' ? 'MOUNTAIN FOLD' : 'VALLEY FOLD');

export function setupVideo(getCurrent) {
  const dlg = $('videoDlg');
  const out = $('videoCanvas');
  const ctx = out.getContext('2d');
  const glCanvas = document.createElement('canvas');
  glCanvas.width = W;
  glCanvas.height = H;
  let view = null;
  let run = null;
  let cur = null;

  function ensureView() {
    if (!view) {
      view = new FoldView(glCanvas, { orbit: false, pixelRatio: 1, preserve: true });
      view.resize(W, H);
    }
  }

  function drawFrame(time) {
    const { model, sim } = cur;
    const tl = cur.tl;
    const seg = tl.segs.find((s) => time < s.start + s.dur) || tl.segs.at(-1);
    const t = Math.min(seg.dur, time - seg.start);
    const n = sim.steps.length;
    const ink = '#221d17';

    // Background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tint(cur.accent, 0.82));
    g.addColorStop(1, '#fbf7f0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    view.az = 0.45 * Math.sin(time * 0.32);
    if (seg.kind === 'pattern') {
      const a = fade(t, seg.dur);
      text(ctx, 'HERE ARE THE CREASES', W / 2, 190, { size: 26, weight: 600, color: cur.accent, spacing: 4, alpha: a });
      text(ctx, 'Can you fold this?', W / 2, 270, { size: 64, family: 'Fraunces', weight: 700, color: ink, alpha: a });
      ctx.save();
      ctx.globalAlpha = a;
      const size = 540;
      drawCreasePattern(ctx, sim, model, { x: (W - size) / 2, y: 360, size }, { upTo: (t / (seg.dur * 0.7)) * n - 0.5, scale: 1.7 });
      ctx.restore();
      // Legend
      const ly = 1010;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineWidth = 6;
      ctx.setLineDash([18, 12]);
      ctx.strokeStyle = VALLEY;
      ctx.beginPath(); ctx.moveTo(120, ly); ctx.lineTo(190, ly); ctx.stroke();
      ctx.setLineDash([24, 9, 4, 9]);
      ctx.strokeStyle = MOUNTAIN;
      ctx.beginPath(); ctx.moveTo(400, ly); ctx.lineTo(470, ly); ctx.stroke();
      ctx.restore();
      text(ctx, 'valley', 205, ly + 10, { size: 30, weight: 500, color: ink, align: 'left', alpha: a });
      text(ctx, 'mountain', 485, ly + 10, { size: 30, weight: 500, color: ink, align: 'left', alpha: a });
      text(ctx, 'Pause and try it, then watch ↓', W / 2, 1130, { size: 30, weight: 500, color: '#6f6558', alpha: a });
    } else {
      if (seg.kind === 'intro') view.show(0, 0);
      else if (seg.kind === 'fold') view.show(seg.i, Math.min(1, t / (seg.dur - 0.5)));
      else { view.az = 0.45 * Math.sin(time * 0.32) + (t / seg.dur) * 0.9; view.show(n, 0); }
      view.render();
      ctx.drawImage(glCanvas, 0, 40);

      if (seg.kind === 'intro') {
        const a = fade(t, seg.dur);
        text(ctx, cur.daily ? 'FOLD OF THE DAY' : 'FOLD LAB', W / 2, 190, { size: 26, weight: 600, color: cur.accent, spacing: 5, alpha: a });
        text(ctx, model.name, W / 2, 285, { size: 92, family: 'Fraunces', weight: 700, color: ink, alpha: a });
        text(ctx, `One square of paper · ${n} steps`, W / 2, 1110, { size: 32, weight: 500, color: '#6f6558', alpha: a });
      } else if (seg.kind === 'fold') {
        const step = model.steps[seg.i];
        const a = fade(t, seg.dur, 0.25);
        // Progress dots
        const dotW = Math.min(46, 520 / n);
        const x0 = W / 2 - (n * dotW) / 2;
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k <= seg.i ? cur.accent : 'rgba(34,29,23,0.15)';
          ctx.beginPath();
          ctx.roundRect(x0 + k * dotW + 4, 150, dotW - 8, 10, 5);
          ctx.fill();
        }
        text(ctx, model.name.toUpperCase(), W / 2, 225, { size: 26, weight: 600, color: '#6f6558', spacing: 4 });
        const kindColor = step.flip ? '#6f6558' : step.type === 'mountain' ? MOUNTAIN : VALLEY;
        text(ctx, `STEP ${seg.i + 1} · ${stepKind(step)}`, W / 2, 1040, { size: 26, weight: 600, color: kindColor, spacing: 3, alpha: a });
        text(ctx, step.hint, W / 2, 1100, { size: 40, weight: 600, color: ink, alpha: a, maxWidth: W - 140 });
      } else {
        const a = Math.min(1, t / 0.4);
        text(ctx, 'Your turn!', W / 2, 260, { size: 96, family: 'Fraunces', weight: 700, color: ink, alpha: a });
        text(ctx, model.fact, W / 2, 1060, { size: 32, weight: 500, color: '#4c4338', alpha: a, maxWidth: W - 160 });
        text(ctx, 'FOLD LAB · A NEW FOLD EVERY DAY', W / 2, 1200, { size: 22, weight: 600, color: cur.accent, spacing: 4, alpha: a });
      }
    }
  }

  function start(record) {
    stop();
    ensureView();
    const c = getCurrent();
    const lum = (hex) => { const v = parseInt(hex.slice(1), 16); return 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255); };
    const accent = lum(c.model.paper.front) < lum(c.model.paper.back) ? c.model.paper.front : c.model.paper.back;
    cur = { ...c, accent, tl: timeline(c.sim) };
    view.setModel(c.model, c.sim);
    view.show(0, 0);

    let recorder = null;
    const chunks = [];
    if (record) {
      const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      if (!mime) { $('vStatus').textContent = 'This browser can\'t record video. Try Chrome or Safari.'; return; }
      recorder = new MediaRecorder(out.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        const a = $('vDl');
        if (a.href) URL.revokeObjectURL(a.href);
        a.href = URL.createObjectURL(blob);
        a.download = `fold-lab-${c.model.id}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
        a.hidden = false;
        a.textContent = `Download ${a.download} (${(blob.size / 1e6).toFixed(1)} MB)`;
        $('vStatus').textContent = 'Done! Ready to post.';
      };
      recorder.start(250);
      $('vDl').hidden = true;
      $('vStatus').textContent = 'Recording… keep this tab open.';
    } else $('vStatus').textContent = 'Previewing…';

    const t0 = performance.now();
    run = { recorder, raf: 0 };
    const tick = () => {
      const time = (performance.now() - t0) / 1000;
      drawFrame(Math.min(time, cur.tl.total));
      if (time >= cur.tl.total) {
        if (recorder) recorder.stop(); else $('vStatus').textContent = '';
        run = null;
        return;
      }
      run.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    if (run.recorder && run.recorder.state !== 'inactive') {
      run.recorder.onstop = null;
      run.recorder.stop();
      $('vStatus').textContent = 'Recording stopped.';
    }
    run = null;
  }

  $('videoBtn').onclick = async () => {
    await document.fonts.ready;
    const c = getCurrent();
    $('vInfo').textContent = `A ${timeline(c.sim).total.toFixed(0)}-second vertical (9:16) clip of the ${c.model.name}: crease-pattern puzzle, the folds with captions, and an outro. Made for Reels, Shorts and TikTok.`;
    $('vDl').hidden = true;
    $('vStatus').textContent = '';
    dlg.showModal();
    start(false);
  };
  $('vPlay').onclick = () => start(false);
  $('vRec').onclick = () => start(true);
  $('vClose').onclick = () => { stop(); dlg.close(); };
  dlg.addEventListener('close', stop);
}
