const canvas = document.getElementById("matrix-canvas");
const ctx = canvas.getContext("2d");
const sceneLabel = document.getElementById("scene-label");

const speedControl = document.getElementById("speed-control");
const brightnessControl = document.getElementById("brightness-control");
const densityControl = document.getElementById("density-control");
const pauseBtn = document.getElementById("pause-btn");
const lockBtn = document.getElementById("lock-btn");
const presetPerformanceBtn = document.getElementById("preset-performance-btn");
const presetQualityBtn = document.getElementById("preset-quality-btn");

const baseColor = [12, 70, 48];
const glowColor = [122, 255, 214];
const coreColor = [238, 255, 247];
const pseudoGlyphs = [0, 1, 2, 3, 4, 5, 6, 7];

const state = {
  speed: 1,
  brightness: 1,
  density: 0.74,
  paused: false,
  lockScene: false,
  preset: "performance",
};

const renderTuning = {
  cellSize: 13,
  figureScale: 1.12,
  detail: 0.78,
  shadow: 0.55,
  maxDelta: 120,
};

const presets = {
  performance: {
    cellSize: 14,
    detail: 0.64,
    shadow: 0.42,
    density: 0.62,
  },
  quality: {
    cellSize: 10,
    detail: 1,
    shadow: 1,
    density: 0.9,
  },
};

const scenes = [
  { name: "Golden Spiral", holdMs: 6200, build: buildGoldenSpiral },
  { name: "Orbit Weave", holdMs: 6200, build: buildOrbitWeave },
  { name: "Fractal Tree", holdMs: 6800, build: buildFractalTree },
  { name: "Rose Lattice", holdMs: 6200, build: buildRoseLattice },
  { name: "Knot Field", holdMs: 6200, build: buildKnotField },
  { name: "Hex Mandala", holdMs: 6200, build: buildHexMandala },
];

const morphMs = 1600;

let w = 0;
let h = 0;
let cols = 0;
let rows = 0;
let cells = [];

let sceneIndex = 0;
let nextSceneIndex = 1;
let sceneElapsed = 0;
let morphElapsed = 0;
let morphing = false;
let lastTs = 0;
let frameParity = 0;
let raf = 0;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function rgba(rgb, a) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function segDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const t = c1 / c2;
  const sx = x1 + t * vx;
  const sy = y1 + t * vy;
  return Math.hypot(px - sx, py - sy);
}

function glyphPath(g, x, y, s, t) {
  const x0 = x + s * 0.18;
  const x1 = x + s * 0.5;
  const x2 = x + s * 0.82;
  const y0 = y + s * 0.16;
  const y1 = y + s * 0.5;
  const y2 = y + s * 0.84;
  const wob = Math.sin(t * 0.003 + x * 0.09 + y * 0.11) * s * 0.08;

  switch (g) {
    case 0: return [[x0, y0, x2, y2], [x0, y2, x2, y0]];
    case 1: return [[x1, y0, x1, y2], [x0, y1, x2, y1]];
    case 2: return [[x0, y0, x2, y1 + wob], [x2, y1 + wob, x0, y2]];
    case 3: return [[x0, y0, x1, y2], [x1, y2, x2, y0]];
    case 4: return [[x0, y1, x1, y0], [x1, y0, x2, y1], [x2, y1, x1, y2]];
    case 5: return [[x0, y0, x2, y0], [x2, y0, x1, y2], [x1, y2, x0, y0]];
    case 6: return [[x0, y0, x0, y2], [x0, y2, x2, y2], [x2, y2, x2, y0]];
    default: return [[x0, y0, x2, y1], [x2, y1, x0, y2]];
  }
}

function addCircleSegments(segments, cx, cy, r, n) {
  for (let i = 0; i < n; i += 1) {
    const a1 = (Math.PI * 2 * i) / n;
    const a2 = (Math.PI * 2 * (i + 1)) / n;
    segments.push([cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r]);
  }
}

function scaleSegments(segments, ox, oy, s) {
  if (s === 1) return segments;
  const out = new Array(segments.length);
  for (let i = 0; i < segments.length; i += 1) {
    const L = segments[i];
    out[i] = [ox + (L[0] - ox) * s, oy + (L[1] - oy) * s, ox + (L[2] - ox) * s, oy + (L[3] - oy) * s];
  }
  return out;
}

function buildGoldenSpiral(time) {
  const segments = [];
  const px = w * 0.5;
  const py = h * 0.56;
  const phi = (1 + Math.sqrt(5)) / 2;
  const maxR = Math.min(w, h) * 0.24;
  const turns = 4.8 + renderTuning.detail * 1.2;
  const step = 0.26 + (1 - renderTuning.detail) * 0.2;
  const phase = time * 0.00055;

  let prevX = px;
  let prevY = py;
  for (let a = 0.12; a <= turns * Math.PI * 2; a += step) {
    const r = maxR * Math.pow(phi, -((turns * Math.PI * 2 - a) / (Math.PI * 2)));
    const ang = a + phase;
    const x = px + Math.cos(ang) * r;
    const y = py + Math.sin(ang) * r;
    segments.push([prevX, prevY, x, y]);
    prevX = x;
    prevY = y;
  }
  addCircleSegments(segments, px, py, maxR * 0.58, Math.floor(18 + 12 * renderTuning.detail));
  return scaleSegments(segments, px, py, renderTuning.figureScale);
}

function buildOrbitWeave(time) {
  const segments = [];
  const px = w * 0.5;
  const py = h * 0.58;
  const t = time * 0.0013;
  const n = Math.floor(56 + 72 * renderTuning.detail);
  const rx = w * 0.2;
  const ry = h * 0.18;
  let lx = px + Math.cos(t) * rx * 0.3;
  let ly = py + Math.sin(t * 1.1) * ry * 0.3;
  for (let i = 0; i <= n; i += 1) {
    const k = i / n;
    const a = t + k * Math.PI * 2;
    const x = px + Math.sin(a * 3) * rx * 0.82 + Math.cos(a * 5) * rx * 0.2;
    const y = py + Math.cos(a * 2) * ry * 0.88 + Math.sin(a * 4) * ry * 0.18;
    segments.push([lx, ly, x, y]);
    lx = x;
    ly = y;
  }
  addCircleSegments(segments, px, py, Math.min(rx, ry) * 0.75, Math.floor(14 + 10 * renderTuning.detail));
  return scaleSegments(segments, px, py, renderTuning.figureScale);
}

function addFractalBranch(segments, x, y, len, ang, depth, sway) {
  if (depth <= 0 || len < 2) return;
  const nx = x + Math.cos(ang) * len;
  const ny = y + Math.sin(ang) * len;
  segments.push([x, y, nx, ny]);
  const fork = 0.42 + Math.sin(sway + depth * 0.6) * 0.08;
  addFractalBranch(segments, nx, ny, len * 0.74, ang - fork, depth - 1, sway + 0.27);
  addFractalBranch(segments, nx, ny, len * 0.74, ang + fork, depth - 1, sway + 0.31);
}

function buildFractalTree(time) {
  const segments = [];
  const px = w * 0.5;
  const py = h * 0.74;
  const sway = time * 0.0011;
  const depth = Math.floor(5 + 2 * renderTuning.detail);
  addFractalBranch(segments, px, py, Math.min(w, h) * 0.16, -Math.PI / 2 + Math.sin(sway) * 0.12, depth, sway);
  addCircleSegments(segments, px, py, Math.min(w, h) * 0.075, Math.floor(10 + 8 * renderTuning.detail));
  return scaleSegments(segments, px, py, renderTuning.figureScale);
}

function buildRoseLattice(time) {
  const segments = [];
  const px = w * 0.5;
  const py = h * 0.56;
  const maxR = Math.min(w, h) * 0.28;
  const petals = 5;
  const t = time * 0.0006;
  const n = Math.floor(120 + 90 * renderTuning.detail);
  let lx = px;
  let ly = py;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = Math.cos(petals * a + t) * maxR * 0.8 + maxR * 0.22;
    const x = px + Math.cos(a + t * 0.7) * r;
    const y = py + Math.sin(a + t * 0.7) * r;
    if (i > 0) {
      segments.push([lx, ly, x, y]);
    }
    lx = x;
    ly = y;
  }
  addCircleSegments(segments, px, py, maxR * 0.62, Math.floor(16 + 14 * renderTuning.detail));
  return scaleSegments(segments, px, py, renderTuning.figureScale);
}

function buildKnotField(time) {
  const segments = [];
  const px = w * 0.5;
  const py = h * 0.56;
  const n = Math.floor(90 + 120 * renderTuning.detail);
  const rx = w * 0.22;
  const ry = h * 0.2;
  const t = time * 0.00075;
  let lx = px;
  let ly = py;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const x = px + Math.sin(2 * a + t) * rx * 0.92 + Math.sin(7 * a - t) * rx * 0.16;
    const y = py + Math.sin(3 * a - t) * ry * 0.88 + Math.cos(5 * a + t) * ry * 0.14;
    if (i > 0) {
      segments.push([lx, ly, x, y]);
    }
    lx = x;
    ly = y;
  }
  return scaleSegments(segments, px, py, renderTuning.figureScale);
}

function buildHexMandala(time) {
  const segments = [];
  const px = w * 0.5;
  const py = h * 0.56;
  const layers = Math.floor(4 + 4 * renderTuning.detail);
  const spin = time * 0.0004;
  for (let l = 1; l <= layers; l += 1) {
    const r = (Math.min(w, h) * 0.06) * l;
    const a0 = spin + l * 0.22;
    for (let i = 0; i < 6; i += 1) {
      const a = a0 + (i / 6) * Math.PI * 2;
      const b = a0 + ((i + 1) / 6) * Math.PI * 2;
      const x1 = px + Math.cos(a) * r;
      const y1 = py + Math.sin(a) * r;
      const x2 = px + Math.cos(b) * r;
      const y2 = py + Math.sin(b) * r;
      segments.push([x1, y1, x2, y2]);
      segments.push([px, py, x1, y1]);
    }
  }
  return scaleSegments(segments, px, py, renderTuning.figureScale);
}

function fieldAtPoint(px, py, segments) {
  let minD = Infinity;
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i];
    const d = segDist(px, py, s[0], s[1], s[2], s[3]);
    if (d < minD) minD = d;
  }
  const cs = renderTuning.cellSize;
  const inner = 1 - smoothstep(0, cs * 0.88, minD);
  const halo = 1 - smoothstep(cs * 0.72, cs * 1.45, minD);
  return clamp(inner * 1.1 + halo * 0.36, 0, 1);
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  state.preset = name;
  renderTuning.cellSize = preset.cellSize;
  renderTuning.detail = preset.detail;
  renderTuning.shadow = preset.shadow;
  state.density = preset.density;
  densityControl.value = String(state.density);
  presetPerformanceBtn.classList.toggle("active", name === "performance");
  presetQualityBtn.classList.toggle("active", name === "quality");
  rebuild();
}

function updateSceneLabel() {
  const flags = `${state.paused ? " [Paused]" : ""}${state.lockScene ? " [Locked]" : ""}`;
  sceneLabel.textContent = `Scene: ${scenes[sceneIndex].name}${flags}`;
}

function rebuild() {
  const dpr = window.devicePixelRatio || 1;
  w = window.innerWidth;
  h = window.innerHeight;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cs = renderTuning.cellSize;
  cols = Math.max(24, Math.floor(w / cs));
  rows = Math.max(16, Math.floor(h / cs));
  cells = new Array(cols * rows).fill(null).map(() => ({
    glyph: pseudoGlyphs[(Math.random() * pseudoGlyphs.length) | 0],
    jitter: Math.random(),
    tw: Math.random() * 0.5 + 0.3,
    next: 30 + Math.random() * 280,
  }));
  updateSceneLabel();
}

function updateTimeline(dt) {
  if (state.paused) return;
  const scaled = dt * state.speed;
  if (morphing) {
    morphElapsed += scaled;
    if (morphElapsed >= morphMs) {
      sceneIndex = nextSceneIndex;
      nextSceneIndex = (sceneIndex + 1) % scenes.length;
      morphing = false;
      morphElapsed = 0;
      sceneElapsed = 0;
      updateSceneLabel();
    }
    return;
  }
  sceneElapsed += scaled;
  if (!state.lockScene && sceneElapsed >= scenes[sceneIndex].holdMs) {
    morphing = true;
    morphElapsed = 0;
  }
}

function updateCells(dt) {
  for (let i = 0; i < cells.length; i += 1) {
    const c = cells[i];
    c.next -= dt * (0.8 + state.speed * 0.4);
    if (c.next <= 0) {
      c.glyph = pseudoGlyphs[(Math.random() * pseudoGlyphs.length) | 0];
      c.tw = Math.random() * 0.6 + 0.2;
      c.jitter = Math.random();
      c.next = 35 + Math.random() * 280;
    }
  }
}

function drawFrame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(renderTuning.maxDelta, ts - lastTs);
  lastTs = ts;

  updateTimeline(dt);
  updateCells(dt);
  frameParity = (frameParity + 1) & 1;

  const curT = ts;
  const nxtT = ts + 160;
  const segA = scenes[sceneIndex].build(curT);
  const segB = morphing ? scenes[nextSceneIndex].build(nxtT) : segA;
  const mt = morphing ? smoothstep(0, 1, morphElapsed / morphMs) : 0;

  ctx.fillStyle = "rgba(1, 7, 5, 0.34)";
  ctx.fillRect(0, 0, w, h);

  const cs = renderTuning.cellSize;
  const skipThreshold = 0.07 + (1 - state.density) * 0.26;
  const glowScale = state.brightness * renderTuning.shadow;
  const alphaScale = 0.7 + state.brightness * 0.65;

  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const i = gy * cols + gx;
      const c = cells[i];
      const x = gx * cs;
      const y = gy * cs;
      const cx = x + cs * 0.5;
      const cy = y + cs * 0.5;

      const eA = fieldAtPoint(cx, cy, segA);
      const eB = fieldAtPoint(cx, cy, segB);
      const energy = mix(eA, eB, mt);
      const relief = smoothstep(0.17, 1, energy);
      const halo = smoothstep(0.03, 0.75, energy);
      const lowEnergy = energy < skipThreshold;

      if (lowEnergy && ((gx + gy + frameParity) & 1) === 0) continue;
      if (lowEnergy && Math.random() > state.density) continue;

      const lines = glyphPath(c.glyph, x, y, cs, ts + c.jitter * 1000);

      if (!lowEnergy || halo > 0.2) {
        ctx.beginPath();
        for (let j = 0; j < lines.length; j += 1) {
          const L = lines[j];
          ctx.moveTo(L[0], L[1]);
          ctx.lineTo(L[2], L[3]);
        }
        const outerA = (0.045 + halo * 0.24) * alphaScale;
        ctx.strokeStyle = rgba(glowColor, outerA);
        ctx.lineWidth = 0.36 + halo * 0.92;
        ctx.shadowColor = rgba(glowColor, 0.55 * halo * glowScale);
        ctx.shadowBlur = halo > 0.24 ? (0.7 + halo * 3.6) * glowScale : 0;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      ctx.beginPath();
      for (let j = 0; j < lines.length; j += 1) {
        const L = lines[j];
        ctx.moveTo(L[0], L[1]);
        ctx.lineTo(L[2], L[3]);
      }
      const coreMix = relief * 0.92 * state.brightness;
      const r = Math.floor(mix(baseColor[0], coreColor[0], coreMix));
      const g = Math.floor(mix(baseColor[1], coreColor[1], coreMix));
      const b = Math.floor(mix(baseColor[2], coreColor[2], coreMix));
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, (0.16 + c.tw * 0.28 + relief * 0.44) * alphaScale)})`;
      ctx.lineWidth = 0.3 + relief * 0.54;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  raf = requestAnimationFrame(drawFrame);
}

function wireControls() {
  speedControl.addEventListener("input", () => {
    state.speed = parseFloat(speedControl.value);
  });
  brightnessControl.addEventListener("input", () => {
    state.brightness = parseFloat(brightnessControl.value);
  });
  densityControl.addEventListener("input", () => {
    state.density = parseFloat(densityControl.value);
  });

  pauseBtn.addEventListener("click", () => {
    state.paused = !state.paused;
    pauseBtn.classList.toggle("active", state.paused);
    pauseBtn.textContent = state.paused ? "Resume" : "Pause";
    updateSceneLabel();
  });

  lockBtn.addEventListener("click", () => {
    state.lockScene = !state.lockScene;
    lockBtn.classList.toggle("active", state.lockScene);
    lockBtn.textContent = state.lockScene ? "Unlock Scene" : "Lock Scene";
    if (state.lockScene) {
      morphing = false;
      morphElapsed = 0;
      nextSceneIndex = sceneIndex;
    } else {
      nextSceneIndex = (sceneIndex + 1) % scenes.length;
    }
    updateSceneLabel();
  });

  presetPerformanceBtn.addEventListener("click", () => applyPreset("performance"));
  presetQualityBtn.addEventListener("click", () => applyPreset("quality"));
}

function start() {
  cancelAnimationFrame(raf);
  lastTs = 0;
  applyPreset(state.preset);
  raf = requestAnimationFrame(drawFrame);
}

wireControls();
window.addEventListener("resize", rebuild);
start();
