// Screen Logger for WebGL Debugging
const debugDiv = document.createElement("div");
debugDiv.style.position = "fixed";
debugDiv.style.bottom = "10px";
debugDiv.style.right = "10px";
debugDiv.style.background = "rgba(2, 10, 7, 0.9)";
debugDiv.style.color = "#cffff0";
debugDiv.style.padding = "10px";
debugDiv.style.fontFamily = "monospace";
debugDiv.style.fontSize = "11px";
debugDiv.style.zIndex = "9999";
debugDiv.style.border = "1px solid #5effb2";
debugDiv.style.maxHeight = "250px";
debugDiv.style.width = "400px";
debugDiv.style.overflowY = "auto";
debugDiv.style.boxShadow = "0 0 10px rgba(94, 255, 178, 0.3)";
document.body.appendChild(debugDiv);

function logDebug(msg, color = "#cffff0") {
  const p = document.createElement("p");
  p.style.margin = "0 0 4px 0";
  p.style.color = color;
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  debugDiv.appendChild(p);
  debugDiv.scrollTop = debugDiv.scrollHeight;
}

window.addEventListener("error", (e) => {
  logDebug(`JS Error: ${e.message} (${e.filename}:${e.lineno})`, "#ff4f4f");
});

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Floating UI Toggle Button (Eye)
const toggleUiBtn = document.createElement("button");
toggleUiBtn.id = "toggle-ui-btn";
toggleUiBtn.textContent = "👁 Hide UI";
toggleUiBtn.style.position = "fixed";
toggleUiBtn.style.top = "1rem";
toggleUiBtn.style.right = "1rem";
toggleUiBtn.style.zIndex = "9999";
toggleUiBtn.style.border = "1px solid rgba(94, 255, 178, 0.4)";
toggleUiBtn.style.background = "rgba(2, 30, 20, 0.76)";
toggleUiBtn.style.color = "#cffff0";
toggleUiBtn.style.padding = "0.35rem 0.65rem";
toggleUiBtn.style.fontFamily = '"JetBrains Mono", "Fira Code", monospace';
toggleUiBtn.style.fontSize = "0.72rem";
toggleUiBtn.style.cursor = "pointer";
toggleUiBtn.style.backdropFilter = "blur(3px)";
toggleUiBtn.style.transition = "opacity 0.2s, background 0.2s";
toggleUiBtn.style.opacity = "0.46";

toggleUiBtn.addEventListener("mouseenter", () => {
  toggleUiBtn.style.opacity = "1";
  toggleUiBtn.style.background = "rgba(4, 50, 35, 0.9)";
});
toggleUiBtn.addEventListener("mouseleave", () => {
  toggleUiBtn.style.opacity = "0.46";
  toggleUiBtn.style.background = "rgba(2, 30, 20, 0.76)";
});

let uiVisible = true;
function toggleUI() {
  uiVisible = !uiVisible;
  const hudElement = document.querySelector(".hud");
  if (uiVisible) {
    if (hudElement) hudElement.style.display = "block";
    debugDiv.style.display = "block";
    toggleUiBtn.textContent = "👁 Hide UI";
  } else {
    if (hudElement) hudElement.style.display = "none";
    debugDiv.style.display = "none";
    toggleUiBtn.textContent = "👁 Show UI";
  }
}

toggleUiBtn.addEventListener("click", toggleUI);
document.body.appendChild(toggleUiBtn);

// Press 'H' key to toggle UI
window.addEventListener("keydown", (e) => {
  if (e.key === "h" || e.key === "H") {
    toggleUI();
  }
});

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

const state = {
  speed: 1,
  brightness: 1,
  density: 0.74,
  paused: false,
  preset: "performance",
};

const presets = {
  performance: {
    fontSize: 16,
    density: 0.65,
  },
  quality: {
    fontSize: 12,
    density: 0.85,
  },
};

let w = 0;
let h = 0;
let cols = 0;
let columns = [];
let lastTs = 0;
let raf = 0;

// Classic Matrix symbols: Japanese Katakana + English digits + symbols
const matrixSymbols = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890+-*<>=:;[]".split("");

function randomSymbol() {
  return matrixSymbols[Math.floor(Math.random() * matrixSymbols.length)];
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  state.preset = name;
  state.density = preset.density;
  densityControl.value = String(state.density);
  presetPerformanceBtn.classList.toggle("active", name === "performance");
  presetQualityBtn.classList.toggle("active", name === "quality");
  rebuild();
}

function rebuild() {
  w = window.innerWidth;
  h = window.innerHeight;
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fontSize = state.preset === "performance" ? 16 : 12;
  cols = Math.floor(w / (fontSize * 0.82));

  columns = [];
  for (let i = 0; i < cols; i++) {
    columns.push({
      x: i * fontSize * 0.82,
      y: Math.random() * -h - 100, // Start above the screen randomly
      speed: 1.8 + Math.random() * 3.5,
      symbols: Array.from({ length: Math.ceil(h / fontSize) + 10 }, () => randomSymbol()),
      opacity: Math.random() * 0.4 + 0.6,
    });
  }
  
  sceneLabel.textContent = "System: Classic Matrix Rain";
}

function drawFrame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(120, ts - lastTs);
  lastTs = ts;

  if (state.paused) {
    raf = requestAnimationFrame(drawFrame);
    return;
  }

  // Fade background slightly to leave trails (controlled by u_brightness)
  const fadeAlpha = clamp(0.12 - (state.brightness - 1) * 0.04, 0.06, 0.22);
  ctx.fillStyle = `rgba(2, 7, 5, ${fadeAlpha})`;
  ctx.fillRect(0, 0, w, h);

  const fontSize = state.preset === "performance" ? 16 : 12;
  ctx.font = `bold ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;
  ctx.textBaseline = "top";

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    
    // Density control filter (distributed evenly across the screen width)
    if (((i * 17) % 100) / 100 > state.density) continue;

    // Update vertical head position based on speed and time delta
    col.y += col.speed * state.speed * (dt / 16.6);

    // If stream goes off-screen, reset to top
    if (col.y > h + fontSize * 12) {
      col.y = Math.random() * -150 - 50;
      col.speed = 1.8 + Math.random() * 3.5;
    }

    // Flicker random characters in this column
    if (Math.random() < 0.05) {
      const idx = Math.floor(Math.random() * col.symbols.length);
      col.symbols[idx] = randomSymbol();
    }

    const currentHeadRow = Math.floor(col.y / fontSize);

    // Draw characters from top down to the head
    for (let r = 0; r <= currentHeadRow; r++) {
      const charY = r * fontSize;
      if (charY < -fontSize || charY > h) continue;

      const sym = col.symbols[r % col.symbols.length];
      const distFromHead = currentHeadRow - r;

      // Limit trail length dynamically based on density
      const maxTrail = 16 + Math.floor(state.density * 12);
      if (distFromHead > maxTrail) continue;

      if (distFromHead === 0) {
        // Head character: Bright White-Green with Glow
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#7effd6";
        ctx.shadowBlur = 8 * state.brightness;
        ctx.fillText(sym, col.x, charY);
        // Reset shadow blur
        ctx.shadowBlur = 0;
      } else {
        // Fading trailing characters
        const alpha = clamp((1.0 - distFromHead / maxTrail) * col.opacity, 0, 1);
        
        let colorStr = "";
        if (distFromHead < 3) {
          colorStr = `rgba(94, 255, 178, ${alpha})`; // Bright neon green near head
        } else if (distFromHead < 9) {
          colorStr = `rgba(46, 152, 109, ${alpha})`; // Matrix green body
        } else {
          colorStr = `rgba(12, 70, 48, ${alpha})`;  // Dark fading green tail
        }

        ctx.fillStyle = colorStr;
        ctx.fillText(sym, col.x, charY);
      }
    }
  }

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
  });

  // Lock Scene button is kept for layout, but locks speed to 0.1 for effect
  lockBtn.addEventListener("click", () => {
    state.lockScene = !state.lockScene;
    lockBtn.classList.toggle("active", state.lockScene);
    lockBtn.textContent = state.lockScene ? "Unlock Stream" : "Lock Stream";
    if (state.lockScene) {
      state.speed = 0.15;
      speedControl.value = "0.15";
    } else {
      state.speed = 1.0;
      speedControl.value = "1.0";
    }
  });

  presetPerformanceBtn.addEventListener("click", () => applyPreset("performance"));
  presetQualityBtn.addEventListener("click", () => applyPreset("quality"));
}

function start() {
  logDebug("Starting application...");
  cancelAnimationFrame(raf);
  lastTs = 0;
  applyPreset(state.preset);
  raf = requestAnimationFrame(drawFrame);
  logDebug("Application loop started.", "#5effb2");
}

wireControls();
window.addEventListener("resize", rebuild);
start();
