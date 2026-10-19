import { simulate } from './engine.js';
import { MODELS } from './models.js';
import { FoldView } from './render3d.js';
import { drawCreasePattern } from './creases.js';
import { setupVideo } from './video.js';

const $ = (id) => document.getElementById(id);

// Browser storage is a convenience here: the app works without it.
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const dayNumber = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2026, 0, 1)) / 864e5);
const dailyIndex = ((dayNumber % MODELS.length) + MODELS.length) % MODELS.length;

const state = { index: dailyIndex, model: null, sim: null, mode: 'puzzle', progress: 0, hints: 0, anim: null };
const view = new FoldView($('view3d'));

const stepKind = (step) => (step.flip ? 'Turn over' : step.type === 'mountain' ? 'Mountain fold' : 'Valley fold');
const kindClass = (step) => (step.flip ? 'F' : step.type === 'mountain' ? 'M' : 'V');

function selectModel(i) {
  state.index = i;
  state.model = MODELS[i];
  state.sim = simulate(state.model);
  state.hints = 0;
  state.anim = null;
  view.setModel(state.model, state.sim);
  const m = state.model;
  const n = m.steps.length;
  $('dateLine').textContent = i === dailyIndex
    ? `Fold of the day · ${now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
    : 'Bonus fold';
  $('name').textContent = m.name;
  $('riddle').textContent = m.riddle;
  $('difficulty').innerHTML = `<span class="dots">${'●'.repeat(m.difficulty)}${'○'.repeat(3 - m.difficulty)}</span> ${['', 'Easy', 'Medium', 'Tricky'][m.difficulty]}`;
  $('foldCount').textContent = `${n} steps`;
  $('fact').textContent = `Did you know? ${m.fact}`;
  document.documentElement.style.setProperty('--accent', accentFor(m));
  renderChips();
  renderHints();
  renderSteps();
  setMode(state.mode);
  drawCP();
  updateDone();
}

// The darker paper color reads better as an accent on buttons.
export function accentFor(m) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  return lum(m.paper.front) < lum(m.paper.back) ? m.paper.front : m.paper.back;
}

function renderChips() {
  $('chips').innerHTML = '';
  MODELS.forEach((m, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-pressed', String(i === state.index));
    b.innerHTML = `<span class="swatch" style="background:${m.paper.front}"></span>${m.name}${i === dailyIndex ? ' <span class="badge">TODAY</span>' : ''}`;
    b.onclick = () => selectModel(i);
    $('chips').append(b);
  });
}

function renderHints() {
  const steps = state.model.steps;
  $('hints').innerHTML = steps.slice(0, state.hints).map((s, i) =>
    `<li><span class="num">${i + 1}</span><span><span class="kind ${kindClass(s)}">${stepKind(s)}</span>${s.hint}</span></li>`).join('');
  $('hintBtn').disabled = state.hints >= steps.length;
  $('hintBtn').textContent = state.hints ? `Next hint (${state.hints}/${steps.length})` : 'Hint';
}

function renderSteps() {
  $('steps').innerHTML = state.model.steps.map((s, i) =>
    `<li data-i="${i}"><span class="num">${i + 1}</span><span><span class="kind ${kindClass(s)}">${stepKind(s)}</span>${s.hint}</span></li>`).join('');
  $('steps').querySelectorAll('li').forEach((li) => {
    li.onclick = () => animateTo(Number(li.dataset.i) + 1, Number(li.dataset.i));
  });
}

function highlightSteps() {
  const p = state.progress;
  $('steps').querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('active', p > i && p < i + 1 || (p === i && p < state.model.steps.length));
    li.classList.toggle('done', p >= i + 1);
  });
  const n = state.model.steps.length;
  $('scrub').value = String((p / n) * 100);
  $('play').textContent = state.anim ? '❚❚ Pause' : p >= n ? '↺ Replay' : '▶ Play';
  $('prev').disabled = p <= 0;
  $('next').disabled = p >= n;
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  $('puzzlePane').hidden = mode !== 'puzzle';
  $('guidedPane').hidden = mode !== 'guided';
  $('playControls').hidden = mode !== 'guided';
  state.anim = null;
  state.progress = mode === 'puzzle' ? state.model.steps.length : 0;
  $('viewLabel').textContent = mode === 'puzzle' ? 'Finished model · drag to turn' : 'Drag to turn';
  highlightSteps();
}

function drawCP() {
  const c = $('cp');
  const r = c.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  c.width = r.width * dpr;
  c.height = r.height * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const padding = 18;
  const highlight = new Set(Array.from({ length: state.hints }, (_, i) => i));
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  drawCreasePattern(ctx, state.sim, state.model, { x: padding, y: padding, size: r.width - padding * 2 }, {
    highlight, paper: dark ? '#f4efe6' : '#fffdf8',
  });
}

// Animates progress to `goal`. `from` optionally jumps first.
function animateTo(goal, from) {
  if (from !== undefined) state.progress = from;
  state.anim = { goal, hold: 0 };
  highlightSteps();
}

function playAll() {
  const n = state.model.steps.length;
  if (state.anim) { state.anim = null; highlightSteps(); return; }
  if (state.progress >= n) state.progress = 0;
  state.anim = { goal: n, hold: 0 };
  highlightSteps();
}

const FOLD_SECONDS = 1.3;
const PAUSE_SECONDS = 0.45;
let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  const a = state.anim;
  if (a) {
    if (a.hold > 0) a.hold -= dt;
    else {
      const before = state.progress;
      const dir = Math.sign(a.goal - before);
      let next = before + (dir * dt) / FOLD_SECONDS;
      // Pause briefly at each finished step so it can be read.
      const boundary = dir > 0 ? Math.floor(before) + 1 : Math.ceil(before) - 1;
      if ((dir > 0 && next >= boundary) || (dir < 0 && next <= boundary)) { next = boundary; a.hold = PAUSE_SECONDS; }
      state.progress = next;
      if (next === a.goal) state.anim = null;
    }
    highlightSteps();
  }
  const p = state.progress;
  const i = Math.floor(p);
  view.show(i, p - i);
  view.render();
  requestAnimationFrame(loop);
}

function resize() {
  const r = $('viewBox').getBoundingClientRect();
  view.resize(r.width, r.height);
  drawCP();
}

// Streaks
function foldedDays() { return store.get('foldlab.days', []); }
function streak() {
  const days = new Set(foldedDays());
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function updateDone() {
  const done = foldedDays().includes(dayKey(now));
  $('done').textContent = done ? 'Folded today ✓' : 'I folded it!';
  const s = streak();
  $('streak').textContent = s ? `${s}-day streak` : 'Start your streak today';
}
function celebrate(el) {
  const r = el.getBoundingClientRect();
  const colors = [state.model.paper.front, state.model.paper.back, '#2563eb', '#f4d03f'];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('span');
    s.className = 'burst';
    s.style.left = `${r.left + r.width / 2}px`;
    s.style.top = `${r.top + r.height / 2}px`;
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 320}px`);
    s.style.setProperty('--dy', `${-60 - Math.random() * 220}px`);
    s.style.setProperty('--r', `${Math.random() * 720}deg`);
    document.body.append(s);
    setTimeout(() => s.remove(), 1100);
  }
}

$('done').onclick = (e) => {
  const days = foldedDays();
  if (!days.includes(dayKey(now))) store.set('foldlab.days', [...days, dayKey(now)]);
  updateDone();
  celebrate(e.currentTarget);
};
$('hintBtn').onclick = () => { state.hints++; renderHints(); drawCP(); };
$('showMe').onclick = () => { setMode('guided'); playAll(); };
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
$('play').onclick = playAll;
$('next').onclick = () => animateTo(Math.min(state.model.steps.length, Math.floor(state.progress) + 1));
$('prev').onclick = () => animateTo(Math.max(0, Math.ceil(state.progress) - 1));
$('scrub').oninput = (e) => {
  state.anim = null;
  state.progress = (Number(e.target.value) / 100) * state.model.steps.length;
  highlightSteps();
};

new ResizeObserver(resize).observe($('viewBox'));
new ResizeObserver(drawCP).observe($('cp'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawCP);
document.fonts.ready.then(drawCP);

setupVideo(() => ({ model: state.model, sim: state.sim, daily: state.index === dailyIndex, dayNumber }));
selectModel(dailyIndex);
resize();
requestAnimationFrame(loop);
