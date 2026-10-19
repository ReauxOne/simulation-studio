// Three.js view of a simulated model. Each piece is a flat mesh built in
// paper coordinates; its world matrix comes from the engine's 2D transform,
// so a piece flipped by a fold shows the paper's back color automatically.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { folded } from './engine.js';

const LAYER = 0.004;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function paperTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  // Faint fibers so the paper doesn't look like plastic.
  for (let i = 0; i < 900; i++) {
    const light = Math.random() > 0.5;
    g.strokeStyle = light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    g.lineWidth = Math.random() * 1.2;
    const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * Math.PI;
    const l = 2 + Math.random() * 7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  return tex;
}

function darken(hex, k) {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(k);
}

function baseMatrix(pc) {
  const [a, b, c, d, e, f] = pc.m;
  const s = Math.sign(a * d - b * c);
  const M = new THREE.Matrix4().set(a, c, 0, e, b, d, 0, f, 0, 0, s, 0, 0, 0, 0, 1);
  return new THREE.Matrix4().makeTranslation(0, 0, pc.layer * LAYER).multiply(M);
}

export class FoldView {
  constructor(canvas, { orbit = true, pixelRatio = Math.min(window.devicePixelRatio, 2), preserve = false } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: preserve });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    this.camera.position.set(0, -2.3, 3.5);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4b5, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.9);
    sun.position.set(1.6, 1.2, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 10 });
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 6;
    this.scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.position.z = -0.03;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.meshes = new Map();

    this.target = new THREE.Vector3();
    this.goalTarget = new THREE.Vector3();
    this.dist = 4;
    this.goalDist = 4;
    if (orbit) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      // The view zooms itself to fit each step, so leave the scroll wheel to the page.
      this.controls.enableZoom = false;
    }
    this.az = 0;
  }

  setModel(model, sim) {
    for (const { group } of this.meshes.values()) this.root.remove(group);
    this.meshes.clear();
    if (this.face) this.root.remove(this.face);
    this.model = model;
    this.sim = sim;
    this.front = new THREE.MeshStandardMaterial({ map: paperTexture(model.paper.front), roughness: 0.9, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1 });
    this.back = new THREE.MeshStandardMaterial({ map: paperTexture(model.paper.back), roughness: 0.9, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 1 });
    this.edgeFront = new THREE.LineBasicMaterial({ color: darken(model.paper.front, 0.78) });
    this.face = this.buildFace(model, sim);
    this.root.add(this.face);
    this.snapCamera = true;
  }

  buildFace(model, sim) {
    const g = new THREE.Group();
    g.visible = false;
    if (!model.face) return g;
    const top = (Math.max(...sim.states.at(-1).map((p) => p.layer)) + 1) * LAYER + 0.002;
    const dark = new THREE.MeshBasicMaterial({ color: 0x2b2420 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const [x, y] of model.face.eyes) {
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), dark);
      eye.position.set(x, y, top);
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), shine);
      glint.position.set(x + 0.017, y + 0.017, top + 0.001);
      g.add(eye, glint);
    }
    if (model.face.nose) {
      const [x, y] = model.face.nose;
      const shape = new THREE.Shape([new THREE.Vector2(-0.05, 0.03), new THREE.Vector2(0.05, 0.03), new THREE.Vector2(0, -0.03)]);
      const nose = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xe0607e }));
      nose.position.set(x, y, top);
      g.add(nose);
      if (model.face.whiskers) {
        const pts = [];
        for (const s of [-1, 1]) for (const dy of [-0.03, 0.02]) {
          pts.push(new THREE.Vector3(x + s * 0.09, y + dy * 0.3, top), new THREE.Vector3(x + s * 0.3, y + dy * 1.6, top));
        }
        g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a2f2a })));
      }
    }
    return g;
  }

  meshFor(pc) {
    let entry = this.meshes.get(pc.id);
    if (!entry) {
      const shape = new THREE.Shape(pc.poly.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ShapeGeometry(shape);
      // Map the texture by paper position so it stays continuous across pieces.
      const uv = geo.attributes.uv;
      const pos = geo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) * 0.5 + 0.5, pos.getY(i) * 0.5 + 0.5);
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      const front = new THREE.Mesh(geo, this.front);
      const back = new THREE.Mesh(geo, this.back);
      front.castShadow = back.castShadow = true;
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pc.poly.map(([x, y]) => new THREE.Vector3(x, y, 0))),
        this.edgeFront,
      );
      group.add(front, back, line);
      entry = { group };
      this.meshes.set(pc.id, entry);
      this.root.add(group);
    }
    return entry;
  }

  // Shows the model before step `i` (t = 0) or partway through folding it.
  show(i, t = 0) {
    const sim = this.sim;
    const n = sim.steps.length;
    let pieces, step = null;
    if (i >= n) { pieces = sim.states[n]; i = n; t = 0; }
    else if (t <= 0) pieces = sim.states[i];
    else if (t >= 1) pieces = sim.states[i + 1];
    else { step = sim.steps[i]; pieces = step.prep; }

    const seen = new Set();
    let rot = null;
    if (step) {
      const { p, d } = step.axis;
      const layers = step.prep.map((pc) => pc.layer);
      const moving = step.prep.filter((pc) => pc.moving).map((pc) => pc.layer);
      let pz;
      if (step.step.flip) pz = (Math.max(...layers) * LAYER) / 2;
      else if (step.step.type === 'mountain') pz = (Math.min(...layers) - 0.5) * LAYER;
      else pz = (Math.max(...layers) + 0.5 + (Math.max(...moving) - Math.min(...moving)) / 2) * LAYER;
      const angle = step.sign * Math.PI * ease(t);
      rot = new THREE.Matrix4().makeTranslation(p[0], p[1], pz)
        .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(d[0], d[1], 0), angle))
        .multiply(new THREE.Matrix4().makeTranslation(-p[0], -p[1], -pz));
    }
    for (const pc of pieces) {
      const { group } = this.meshFor(pc);
      const M = baseMatrix(pc);
      if (rot && pc.moving) M.premultiply(rot);
      group.matrix.copy(M);
      group.visible = true;
      seen.add(pc.id);
    }
    for (const [id, { group }] of this.meshes) if (!seen.has(id)) group.visible = false;
    this.face.visible = i === n;

    // Keep the camera framed on what's visible (blending between states mid-fold).
    const frame = (pcs) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pc of pcs) for (const [x, y] of folded(pc)) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      return [(minX + maxX) / 2, (minY + maxY) / 2, Math.max(maxX - minX, maxY - minY)];
    };
    const a = frame(step ? sim.states[i] : pieces);
    const b = step ? frame(sim.states[i + 1]) : a;
    const k = step ? ease(t) : 0;
    const [cx, cy, size] = a.map((v, j) => v + (b[j] - v) * k);
    this.goalTarget.set(cx, cy, 0);
    const fit = Math.max(size, 1.0) * this.fitScale();
    this.goalDist = fit / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
  }

  fitScale() {
    return this.camera.aspect < 1 ? 1.35 / this.camera.aspect : 1.35;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    const blend = this.snapCamera ? 1 : 0.08;
    this.snapCamera = false;
    this.target.lerp(this.goalTarget, blend);
    this.dist += (this.goalDist - this.dist) * blend;
    if (this.controls) {
      // Move the orbit target and distance smoothly, keep the user's viewing angle.
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.controls.target.copy(this.target);
      this.camera.position.copy(this.target).addScaledVector(dir, this.dist);
      this.controls.update();
    } else {
      // Scripted camera: circle slowly above the model.
      const dir = new THREE.Vector3(Math.sin(this.az) * 0.6, -Math.cos(this.az) * 0.6, 1).normalize();
      this.camera.position.copy(this.target).addScaledVector(dir, this.dist);
      this.camera.lookAt(this.target);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
