import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/Scene3.css";
const PHOTONIC = "#f0ab00";

// Hover sparkles — tune here
const SPARK = {
  max: 160,           // sparkles alive at once
  spacing: 9,         // px of cursor travel per sparkle (lower = denser trail)
  idleRate: 5,        // sparkles per second while the cursor rests in the scene
  life: [0.55, 1.3],  // seconds each one lives (min, max)
  gravity: 24,        // px/s² — they drift down like glitter
  drag: 1.8,          // how quickly their initial burst slows
  starChance: 0.3,    // share of 4-point stars vs. round glints
};
// [glow, core] colours per theme; "gold" = PHOTONIC
const SPARK_COLORS = {
  dark:  { gold: ["240, 171, 0", "255, 236, 170"], glint: ["255, 255, 255", "255, 255, 255"] },
  light: { gold: ["240, 171, 0", "205, 130, 0"],   glint: ["196, 120, 0",   "150, 88, 0"] },
};

/* ============================================================
   MACH–ZEHNDER MODULATOR
   A CW laser feeds a gold waveguide. A Y-splitter sends half the
   light down each arm. The upper arm runs between RF electrodes:
   when a "1" arrives they glow, cyan field lines bridge the arm
   and its phase shifts by Δφ = π·V/Vπ. The lower arm carries a
   fixed DC bias of φ₀ = π, so with no voltage the two waves meet
   the Y-combiner in anti-phase and cancel (dark), and with V = Vπ
   they meet in phase (bright). Net effect: the light leaving the
   chip spells out the same bits as the electrical input.
   Every wave is drawn analytically in one shader; nothing here
   triggers a React re-render once mounted.
   ============================================================ */

// Modulator — tune here
const MZM = {
  bitPeriod: 1.3,     // seconds per bit at speed = 1
  bitLength: 0.46,    // scene units one bit occupies on the streams (sets the light speed)
  cyclesPerBit: 1.5,  // optical carrier wavelengths drawn per bit (visual, not physical)
  edge: 0.2,          // share of a bit spent rising / falling (band-limited NRZ)
  amp: 0.095,         // field amplitude in the input guide; each arm carries amp/√2
  tilt: -0.34,        // chip incline away from the viewer (rad)
  sway: 0.03,         // idle yaw (rad); 0 = perfectly still
  // repeating data word — keep exactly 16 bits (the shader reads a 16-slot array)
  bits: [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1],
};
const VG = MZM.bitLength / MZM.bitPeriod;                    // light speed (units / s)
const K = (2 * Math.PI * MZM.cyclesPerBit) / MZM.bitLength;  // carrier wavenumber
const T_START = 7.3;                                         // start mid-pattern so the streams are full

// Chip layout in scene units (the whole group is scaled to fit the frame)
const G = {
  xLaser: -2.75,            // laser aperture = chip's left facet
  xS0: -2.15, xS1: -1.45,   // Y-splitter S-bends
  xC0: 1.45, xC1: 2.15,     // Y-combiner S-bends
  xChip: 2.75,              // chip's right facet
  xEnd: 3.55,               // end of the output fiber
  H: 0.48,                  // arm offset from the axis
  gap: 0.125,               // electrode inner edge → arm centre
  padW: 0.22,               // electrode width
  e: [-1.25, 1.25],         // RF electrode span (upper arm)
  b: [-0.55, 0.55],         // DC-bias electrode span (lower arm)
  chipY: 1.08,              // chip half-height
  tickerY: 1.42,            // electrical data trace (off-chip, above it)
  tickerX0: -3.2,           // where that trace starts
  feedX: -1.1,              // where the RF feed drops onto the electrode
  feedR: 0.16,              // corner radius of the drop
  ribbonW: 0.18,            // half-width of each light ribbon
  tickerAmp: 0.075,         // electrical trace swing
  tickerW: 0.14,            // half-width of the electrical ribbon
};
// what must stay in frame (labels included)
const FIT = { x0: -3.3, x1: 3.62, y0: -1.12, y1: 1.74 };

// [colours] per theme — the paradigm gold stays, neutrals invert
const PALETTE = {
  dark: {
    gold: "#f0ab00", hot: "#ffffff", cyan: "#3fe0ff", padGlow: "#ffd36b",
    substrate: "#0c0f15", edge: "#f0ab00", edgeOpacity: 0.32,
    metal: "#b8892e", biasMetal: "#5e4c27", housing: "#1d2129", fiber: "#a9c4dc",
    text: "rgba(232, 232, 232, 0.74)", dim: "rgba(232, 232, 232, 0.26)",
    bitOn: "#fff2cc", bitGlow: "0 0 6px rgba(240, 171, 0, 0.9)",
    cyanCss: "#3fe0ff", cyanGlow: "0 0 6px rgba(63, 224, 255, 0.8)",
    blending: THREE.AdditiveBlending, dark: 1,
  },
  light: {
    gold: "#c98300", hot: "#ff5a00", cyan: "#0a87a8", padGlow: "#ffb000",
    substrate: "#f3eee4", edge: "#c98300", edgeOpacity: 0.5,
    metal: "#c8962f", biasMetal: "#a48a55", housing: "#3a3f48", fiber: "#6f879c",
    text: "rgba(24, 24, 24, 0.74)", dim: "rgba(24, 24, 24, 0.26)",
    bitOn: "#c25400", bitGlow: "none",
    cyanCss: "#0a7d9c", cyanGlow: "none",
    blending: THREE.NormalBlending, dark: 0,
  },
};
const MONO = "'Courier New', Courier, monospace";
const TAU = Math.PI * 2;

const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const bitAt = (n) => MZM.bits[((n % 16) + 16) % 16];
/* Drive voltage in units of Vπ (0 → 1): band-limited NRZ.
   Mirrored by drive() in the shader — keep the two in sync. */
function drive(t) {
  const x = t / MZM.bitPeriod;
  const n = Math.floor(x);
  const prev = bitAt(n - 1);
  return prev + (bitAt(n) - prev) * smooth01((x - n) / MZM.edge);
}
// P_out / P_in = cos²(Δφ/2) with Δφ = π·V/Vπ − φ₀, φ₀ = π  →  sin²(π·V / 2Vπ)
const powerOf = (v) => Math.sin((Math.PI * v) / 2) ** 2;
const hexVec = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/* ---------- layout: centrelines sampled with arc length ---------- */
function sampleX(x0, x1, fy, step = 0.01) {
  const n = Math.max(2, Math.ceil((x1 - x0) / step));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    out.push({ x, y: fy(x) });
  }
  return out;
}
function withArc(points, s0) {
  let s = s0;
  return points.map((p, i) => {
    if (i) s += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    return { ...p, s };
  });
}
function sAtX(path, x) {
  for (let i = 1; i < path.length; i++) {
    if (path[i].x >= x) {
      const a = path[i - 1], b = path[i];
      return a.s + ((b.s - a.s) * (x - a.x)) / (b.x - a.x || 1);
    }
  }
  return path[path.length - 1].s;
}
function buildLayout() {
  const bend = (x, x0, x1) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, (x - x0) / (x1 - x0))))) / 2;
  const armY = (sign) => (x) =>
    sign * G.H * (x < G.xC0 ? bend(x, G.xS0, G.xS1) : 1 - bend(x, G.xC0, G.xC1));

  const input = withArc(sampleX(G.xLaser, G.xS0, () => 0), 0);
  const sSplit = input[input.length - 1].s;
  const armU = withArc(sampleX(G.xS0, G.xC1, armY(1), 0.008), sSplit);   // modulated arm
  const armL = withArc(sampleX(G.xS0, G.xC1, armY(-1), 0.008), sSplit);  // bias arm
  const sC = armU[armU.length - 1].s;
  const output = withArc(sampleX(G.xC1, G.xEnd, () => 0), sC);

  // electrical trace: s = distance still to travel before the feed corner
  const tickerEnd = G.feedX - G.feedR;
  const ticker = sampleX(G.tickerX0, tickerEnd, () => G.tickerY).map((p) => ({ ...p, s: tickerEnd - p.x }));
  const feed = [];
  const cy = G.tickerY - G.feedR;
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI / 2 - (i / 16) * (Math.PI / 2);
    feed.push({ x: tickerEnd + G.feedR * Math.cos(a), y: cy + G.feedR * Math.sin(a), s: 0 });
  }
  const padTop = G.H + G.gap + G.padW;
  for (let i = 1; i <= 8; i++) feed.push({ x: G.feedX, y: cy + ((padTop - cy) * i) / 8, s: 0 });

  return {
    input, armU, armL, output, ticker, feed,
    outputChip: output.filter((p) => p.x <= G.xChip + 1e-6),
    sC,
    sEnd: output[output.length - 1].s,
    tickerEnd,
    tickerLen: tickerEnd - G.tickerX0,
    ranges: [sAtX(armU, G.e[0]), sAtX(armU, G.e[1]), sAtX(armL, G.b[0]), sAtX(armL, G.b[1])],
  };
}

/* ---------- geometry ---------- */
// A flat strip along a centreline: aS = arc length, aOff = signed offset across it
function pushRibbon(acc, path, halfW, kind, z) {
  const base = acc.pos.length / 3;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    for (const side of [-1, 1]) {
      acc.pos.push(p.x + nx * halfW * side, p.y + ny * halfW * side, z);
      acc.s.push(p.s);
      acc.off.push(halfW * side);
      acc.kind.push(kind);
    }
    if (i > 0) {
      const k = base + (i - 1) * 2;
      acc.idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
}
function buildRibbonGeometry(L) {
  const acc = { pos: [], s: [], off: [], kind: [], idx: [] };
  pushRibbon(acc, L.input, G.ribbonW, 0, 0.056);
  pushRibbon(acc, L.armU, G.ribbonW, 1, 0.056);
  pushRibbon(acc, L.armL, G.ribbonW, 2, 0.056);
  pushRibbon(acc, L.output, G.ribbonW, 3, 0.056);
  pushRibbon(acc, L.ticker, G.tickerW, 4, 0.03);
  pushRibbon(acc, L.feed, 0.07, 5, 0.06);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute("aS", new THREE.Float32BufferAttribute(acc.s, 1));
  g.setAttribute("aOff", new THREE.Float32BufferAttribute(acc.off, 1));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(acc.kind, 1));
  g.setIndex(acc.idx);
  g.computeBoundingSphere();
  return g;
}
// Field lines: arcs from the signal electrode's inner edge, over the arm, to ground
function buildFieldGeometry() {
  const count = 13, segs = 26, halfW = 0.036, bulge = 0.2;
  const yTop = G.H + G.gap, yBot = G.H - G.gap, z0 = 0.046;
  const pos = [], aT = [], aSide = [], aIdx = [], idx = [];
  for (let li = 0; li < count; li++) {
    const x = G.e[0] + 0.1 + ((G.e[1] - G.e[0] - 0.2) * li) / (count - 1);
    const base = pos.length / 3;
    for (let j = 0; j <= segs; j++) {
      const t = j / segs;
      const y = yTop + (yBot - yTop) * t;
      const z = z0 + bulge * Math.sin(Math.PI * t);
      for (const side of [-1, 1]) {
        pos.push(x + side * halfW, y, z);
        aT.push(t);
        aSide.push(side);
        aIdx.push(li / (count - 1));
      }
      if (j > 0) {
        const k = base + (j - 1) * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(aSide, 1));
  g.setAttribute("aIdx", new THREE.Float32BufferAttribute(aIdx, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
function buildRectLine(w, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(
    [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0], 3));
  return g;
}

/* ---------- textures (drawn once) ---------- */
function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.75)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.2)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
// soft-edged rectangle — the glow laid over an electrode
function makePadTexture() {
  const w = 128, h = 32;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const edge = (u, m) => smooth01(Math.min(u, 1 - u) / m);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(edge((x + 0.5) / w, 0.1) * edge((y + 0.5) / h, 0.4) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

/* ---------- shaders ---------- */
const GLSL_DRIVE = /* glsl */ `
  uniform float uBits[16];
  uniform float uT;
  uniform float uEdge;
  float bitAt(float n) {
    float m = n - 16.0 * floor(n / 16.0);
    int idx = int(m + 0.5);
    float b = 0.0;
    for (int i = 0; i < 16; i++) { if (i == idx) b = uBits[i]; }
    return b;
  }
  float drive(float t) {
    float x = t / uT;
    float n = floor(x);
    return mix(bitAt(n - 1.0), bitAt(n), smoothstep(0.0, uEdge, x - n));
  }
`;

const WAVE_VERT = /* glsl */ `
  attribute float aS;
  attribute float aOff;
  attribute float aKind;
  varying float vS;
  varying float vOff;
  varying float vKind;
  void main() {
    vS = aS; vOff = aOff; vKind = aKind;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* One shader paints every ribbon. aKind:
   0 input · 1 modulated arm · 2 bias arm · 3 output · 4 electrical trace · 5 RF feed */
const WAVE_FRAG = /* glsl */ `
  #define PI 3.14159265359
  uniform float uTime;    // animation clock (s)
  uniform float uWt;      // carrier phase k·vg·t, wrapped to [0, 2π)
  uniform float uK;       // carrier wavenumber
  uniform float uVg;      // light speed
  uniform float uA0;      // input field amplitude
  uniform float uAe;      // electrical trace swing
  uniform float uV;       // drive voltage now, in Vπ
  uniform float uW;       // ribbon half-width
  uniform vec4 uRanges;   // RF electrode s0, s1 · bias electrode s0, s1
  uniform vec3 uSpan;     // combiner s, output end s, electrical trace length
  uniform vec3 uGold;
  uniform vec3 uHot;
  uniform vec3 uCyan;
  uniform float uDark;
  varying float vS;
  varying float vOff;
  varying float vKind;
  ${GLSL_DRIVE}

  float ramp(float s, float a, float b) { return clamp((s - a) / (b - a), 0.0, 1.0); }
  float lineCore(float d) { return 1.0 - smoothstep(0.6, 1.8, d); }

  void main() {
    float px = max(fwidth(vOff), 1e-5);   // scene units per pixel, across the ribbon
    float s = vS;
    float soft = mix(0.55, 1.0, uDark);   // halos read lighter on a pale chip
    vec3 acc = vec3(0.0);
    float a = 0.0;

    if (vKind < 3.5) {
      // --- light: E = amp · sin(k·s − ω·t + φ) -------------------------
      float amp; float ph; float power; float hot = 0.0;
      if (vKind < 0.5) {            // input: full field
        amp = uA0; ph = 0.0; power = 1.0;
      } else if (vKind < 1.5) {     // modulated arm: phase grows along the electrode, Δφ = π·V/Vπ
        amp = uA0 * 0.70711; ph = PI * uV * ramp(s, uRanges.x, uRanges.y); power = 0.5;
      } else if (vKind < 2.5) {     // bias arm: fixed φ₀ = π
        amp = uA0 * 0.70711; ph = PI * ramp(s, uRanges.z, uRanges.w); power = 0.5;
      } else {                      // output: the two arms superposed, carried away at vg
        float vr = drive(uTime - (s - uSpan.x) / uVg);
        float hlf = 0.5 * PI * (vr - 1.0);         // Δφ / 2
        amp = uA0 * cos(hlf);
        ph = 0.5 * PI * (vr + 1.0);
        power = cos(hlf) * cos(hlf);               // cos²(Δφ/2)
        hot = power;
      }
      float lit = abs(amp) / uA0;
      float th = uK * s - uWt + ph;
      float h = amp * sin(th);
      float dh = amp * uK * cos(th);
      float d = abs(vOff - h) / sqrt(1.0 + dh * dh) / px;   // px to the curve
      float core = lineCore(d) * (0.06 + 0.94 * lit);
      float halo = exp(-d / 5.0) * 0.32 * lit * soft;
      float mode = exp(-pow(vOff / (uW * 0.42), 2.0)) * (0.16 * power + 0.42 * hot);
      float bloom = exp(-pow(vOff / (uW * 0.95), 2.0)) * 0.3 * hot * hot * soft;
      vec3 cCore = mix(uGold, uHot, 0.45 + 0.55 * hot);
      vec3 cMode = mix(uGold, uHot, 0.7 * hot);
      acc = cCore * core + uGold * halo + cMode * mode + uHot * bloom;
      a = core + halo + mode + bloom;
      float fade = smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(uSpan.y - 0.4, uSpan.y, s));
      acc *= fade; a *= fade;
    } else if (vKind < 4.5) {
      // --- electrical NRZ trace heading for the electrode ---------------
      float v0 = drive(uTime + s / uVg);
      float v1 = drive(uTime + (s + 0.004) / uVg);
      float h = uAe * (2.0 * v0 - 1.0);
      float dh = uAe * 2.0 * (v1 - v0) / 0.004;
      float d = abs(vOff - h) / sqrt(1.0 + dh * dh) / px;
      float core = lineCore(d);
      float halo = exp(-d / 4.0) * 0.3 * soft;
      float rail = (1.0 - smoothstep(0.3, 1.3, abs(abs(vOff) - uAe) / px)) * 0.16 * step(0.45, fract(s * 16.0));
      acc = uCyan * (core + halo + rail);
      a = core + halo + rail;
      float fade = 1.0 - smoothstep(uSpan.z - 0.45, uSpan.z, s);
      acc *= fade; a *= fade;
    } else {
      // --- RF feed: carries the present voltage -------------------------
      float d = abs(vOff) / px;
      float lvl = 0.25 + 0.75 * uV;
      float core = lineCore(d) * lvl;
      float halo = exp(-d / 4.0) * 0.4 * lvl * soft;
      acc = uCyan * (core + halo);
      a = core + halo;
    }
    float alpha = clamp(a, 0.0, 1.0);
    gl_FragColor = vec4(acc / max(a, 1e-4), alpha);
  }
`;

const FIELD_VERT = /* glsl */ `
  attribute float aT;
  attribute float aSide;
  attribute float aIdx;
  varying float vT;
  varying float vSide;
  varying float vIdx;
  void main() {
    vT = aT; vSide = aSide; vIdx = aIdx;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Lines draw themselves across the gap as V rises (rippling away from the feed),
// retract as it falls, and carry a flow that runs from + to ground.
const FIELD_FRAG = /* glsl */ `
  uniform float uV;
  uniform float uFlow;
  uniform vec3 uCyan;
  varying float vT;
  varying float vSide;
  varying float vIdx;
  void main() {
    float grow = uV * 1.45 - vIdx * 0.45;
    float drawn = 1.0 - smoothstep(grow - 0.12, grow, vT);
    float flow = 0.5 + 0.5 * sin(6.2831853 * (vT * 2.5 - uFlow));
    float across = exp(-vSide * vSide * 7.0);
    float ends = smoothstep(0.0, 0.08, vT) * (1.0 - smoothstep(0.92, 1.0, vT));
    float a = drawn * across * ends * (0.55 + 0.45 * flow) * smoothstep(0.0, 0.15, uV);
    gl_FragColor = vec4(uCyan, a);
  }
`;

/* ---------- scene pieces ---------- */
function Tag({ position, color, size = 9.5, weight = 700, spacing = "0.16em", fontScale = 1, children }) {
  return (
    <Html position={position} center zIndexRange={[9, 0]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: size * fontScale,
          fontWeight: weight,
          letterSpacing: spacing,
          color,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        {children}
      </div>
    </Html>
  );
}

// A pool of "1"/"0" digits riding a stream; text is written straight to the DOM
function DigitPool({ count, slots, fontScale = 1 }) {
  return Array.from({ length: count }, (_, i) => (
    <group key={i} ref={(el) => { slots.current[i] = { ...slots.current[i], group: el }; }}>
      <Html center zIndexRange={[9, 0]} style={{ pointerEvents: "none" }}>
        <span
          ref={(el) => { slots.current[i] = { ...slots.current[i], span: el }; }}
          style={{ fontFamily: MONO, fontSize: 11 * fontScale, fontWeight: 700, opacity: 0, userSelect: "none" }}
        />
      </Html>
    </group>
  ));
}

function ModulatorScene({ speed, isDark, labels }) {
  const L = useMemo(buildLayout, []);
  const pal = isDark ? PALETTE.dark : PALETTE.light;
  const palRef = useRef(pal);
  palRef.current = pal;
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  // studio reflections for the gold, generated locally (no HDR download); handed to each
  // material so envMapIntensity is honoured on every three.js version
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment(gl);
    const tex = pm.fromScene(room, 0.04).texture;
    room.dispose?.();
    pm.dispose();
    return tex;
  }, [gl]);

  const tiltRef = useRef(null);
  const padGlowRefs = useRef([]);
  const rimRefs = useRef([]);
  const combinerRef = useRef(null);
  const leakRefs = useRef([]);
  const pulseRefs = useRef([]);
  const eSlots = useRef([]);   // electrical digits
  const oSlots = useRef([]);   // optical digits

  const ribbonGeo = useMemo(() => buildRibbonGeometry(L), [L]);
  const fieldGeo = useMemo(buildFieldGeometry, []);
  const chipW = G.xChip - G.xLaser;
  const rectGeo = useMemo(() => buildRectLine(chipW, G.chipY * 2), [chipW]);
  const tubes = useMemo(
    () => [L.input, L.armU, L.armL, L.outputChip].map((path) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(p.x, p.y, 0.024))),
        Math.max(24, Math.round(path.length / 3)), 0.024, 8, false)),
    [L]);
  const glowTex = useMemo(makeGlowTexture, []);
  const padTex = useMemo(makePadTexture, []);

  const waveMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: WAVE_VERT,
    fragmentShader: WAVE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
    uniforms: {
      uTime: { value: 0 }, uWt: { value: 0 }, uK: { value: K }, uVg: { value: VG },
      uA0: { value: MZM.amp }, uAe: { value: G.tickerAmp }, uV: { value: 0 }, uW: { value: G.ribbonW },
      uRanges: { value: new THREE.Vector4(...L.ranges) },
      uSpan: { value: new THREE.Vector3(L.sC, L.sEnd, L.tickerLen) },
      uBits: { value: MZM.bits.map(Number) }, uT: { value: MZM.bitPeriod }, uEdge: { value: MZM.edge },
      uGold: { value: new THREE.Vector3() }, uHot: { value: new THREE.Vector3() },
      uCyan: { value: new THREE.Vector3() }, uDark: { value: 1 },
    },
  }), [L]);
  const fieldMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uV: { value: 0 }, uFlow: { value: 0 }, uCyan: { value: new THREE.Vector3() } },
  }), []);

  const rfMat = useMemo(() => new THREE.MeshStandardMaterial({
    metalness: 1, roughness: 0.38, envMap: env, envMapIntensity: 0.6,
    emissive: new THREE.Color(PHOTONIC), emissiveIntensity: 0.04,
  }), [env]);

  useEffect(() => () => {
    [ribbonGeo, fieldGeo, rectGeo, ...tubes, glowTex, padTex, waveMat, fieldMat, rfMat, env].forEach((o) => o.dispose());
  }, [ribbonGeo, fieldGeo, rectGeo, tubes, glowTex, padTex, waveMat, fieldMat, rfMat, env]);

  // theme → shader colours + blending (no recompiles)
  useEffect(() => {
    const u = waveMat.uniforms;
    u.uGold.value.copy(hexVec(pal.gold));
    u.uHot.value.copy(hexVec(pal.hot));
    u.uCyan.value.copy(hexVec(pal.cyan));
    u.uDark.value = pal.dark;
    fieldMat.uniforms.uCyan.value.copy(hexVec(pal.cyan));
    rfMat.color.set(pal.metal);
    waveMat.blending = pal.blending;
    fieldMat.blending = pal.blending;
    // digits re-pick their colours on the next frame
    [...eSlots.current, ...oSlots.current].forEach((sl) => { if (sl?.span) sl.span.__n = null; });
  }, [pal, waveMat, fieldMat, rfMat]);

  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  useFrame((state) => {
    const clock = state.clock.elapsedTime;
    const t = clock * speed * (reduceMotion ? 0.5 : 1) + T_START;
    const T = MZM.bitPeriod;
    const v = drive(t);          // V / Vπ on the electrode right now
    const P = powerOf(v);        // light leaving the combiner right now
    const p = palRef.current;

    const u = waveMat.uniforms;
    u.uTime.value = t;
    u.uWt.value = (K * VG * t) % TAU;
    u.uV.value = v;
    fieldMat.uniforms.uV.value = v;
    fieldMat.uniforms.uFlow.value = (t * 1.1) % 1;

    // electrodes glow with the voltage
    rfMat.emissiveIntensity = 0.03 + 0.85 * v;
    padGlowRefs.current.forEach((m) => { if (m) m.opacity = 0.6 * v; });
    rimRefs.current.forEach((m) => { if (m) m.opacity = 0.9 * v; });

    // combiner: flare when in phase; when not, the light leaks into the substrate
    if (combinerRef.current) {
      combinerRef.current.material.opacity = 0.1 + 0.9 * P;
      const k = 0.26 + 0.32 * P;
      combinerRef.current.scale.set(k, k, 1);
    }
    leakRefs.current.forEach((sp) => { if (sp) sp.material.opacity = 0.34 * (1 - P); });

    // optical bits: centre of bit n passes the combiner at t = (n + ½)·T
    const nO = Math.floor(t / T - 0.5);
    for (let j = 0; j < 4; j++) {
      const n = nO - j;
      const d = VG * (t - (n + 0.5) * T);              // distance past the combiner
      const vis = smooth01(d / 0.12) * (1 - smooth01((d - (L.sEnd - L.sC - 0.32)) / 0.32));
      const x = G.xC1 + d;
      const pulse = pulseRefs.current[j];
      if (pulse) {
        pulse.position.set(x, 0, 0.07);
        pulse.material.opacity = bitAt(n) ? 0.85 * vis : 0;
      }
      const slot = oSlots.current[j];
      if (slot?.group && slot.span) {
        slot.group.position.set(x, -0.27, 0.06);
        paintDigit(slot.span, n, vis, p.bitOn, p.bitGlow, p.dim);
      }
    }
    // electrical bits still on the wire: centre reaches the feed at t = (n + ½)·T
    const nE = nO + 1;
    for (let j = 0; j < 6; j++) {
      const n = nE + j;
      const d = VG * ((n + 0.5) * T - t);              // distance left to the feed
      const vis = smooth01(d / 0.1) * (1 - smooth01((d - (L.tickerLen - 0.4)) / 0.4));
      const slot = eSlots.current[j];
      if (slot?.group && slot.span) {
        slot.group.position.set(L.tickerEnd - d, G.tickerY - 0.2, 0.03);
        paintDigit(slot.span, n, vis, p.cyanCss, p.cyanGlow, p.dim);
      }
    }

    if (tiltRef.current && !reduceMotion) tiltRef.current.rotation.y = MZM.sway * Math.sin(clock * 0.3);
  });

  // fit the chip (and its labels) to the frame, centred
  const fitW = FIT.x1 - FIT.x0;
  const fitH = (FIT.y1 - FIT.y0) * Math.cos(MZM.tilt);
  const scale = Math.min((viewport.width * 0.96) / fitW, (viewport.height * 0.9) / fitH);
  const cx = (FIT.x0 + FIT.x1) / 2;
  const cy = (FIT.y0 + FIT.y1) / 2;
  // labels are DOM text: shrink them with the chip on small frames
  const fs = Math.min(1, Math.max(0.66, ((size.width / viewport.width) * scale) / 100));

  const eLen = G.e[1] - G.e[0], eCx = (G.e[0] + G.e[1]) / 2;
  const bLen = G.b[1] - G.b[0], bCx = (G.b[0] + G.b[1]) / 2;
  const sigY = G.H + G.gap + G.padW / 2;
  const gndY = G.H - G.gap - G.padW / 2;
  const bTopY = -G.H + G.gap + G.padW / 2;
  const bBotY = -G.H - G.gap - G.padW / 2;
  const padZ = 0.0225;
  const fiberLen = G.xEnd - G.xChip;
  // glows are overlays: no depth test, or the tilted chip slices them into rectangles
  const sprite = { map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: pal.blending, toneMapped: false };

  return (
    <group scale={scale}>
      <group ref={tiltRef} rotation={[MZM.tilt, 0, 0]}>
        <group position={[-cx, -cy, 0]}>
          {/* chip */}
          <RoundedBox args={[chipW, G.chipY * 2, 0.08]} radius={0.03} smoothness={3} position={[0, 0, -0.04]}>
            <meshStandardMaterial color={pal.substrate} roughness={0.85} metalness={0}
              envMap={env} envMapIntensity={isDark ? 0.12 : 0.3} />
          </RoundedBox>
          <lineLoop geometry={rectGeo} position={[0, 0, 0.001]}>
            <lineBasicMaterial color={pal.edge} transparent opacity={pal.edgeOpacity} />
          </lineLoop>

          {/* gold waveguide */}
          {tubes.map((g, i) => (
            <mesh key={i} geometry={g}>
              <meshStandardMaterial color={pal.metal} metalness={0.85} roughness={0.3}
                envMap={env} emissive={PHOTONIC} emissiveIntensity={0.12} />
            </mesh>
          ))}

          {/* RF electrodes (upper arm) — one shared material so they glow together */}
          {[sigY, gndY].map((y, i) => (
            <RoundedBox key={i} args={[eLen, G.padW, 0.045]} radius={0.012} smoothness={2}
              position={[eCx, y, padZ]} material={rfMat} />
          ))}
          {[sigY, gndY].map((y, i) => (
            <mesh key={`g${i}`} position={[eCx, y, 0.047]} renderOrder={3}>
              <planeGeometry args={[eLen + 0.08, G.padW + 0.08]} />
              <meshBasicMaterial ref={(m) => { padGlowRefs.current[i] = m; }} map={padTex}
                color={pal.padGlow} transparent opacity={0} depthWrite={false}
                blending={pal.blending} toneMapped={false} />
            </mesh>
          ))}
          {[G.H + G.gap, G.H - G.gap].map((y, i) => (
            <mesh key={`r${i}`} position={[eCx, y, 0.047]} renderOrder={3}>
              <planeGeometry args={[eLen, 0.014]} />
              <meshBasicMaterial ref={(m) => { rimRefs.current[i] = m; }} color={pal.cyan}
                transparent opacity={0} depthWrite={false} blending={pal.blending} toneMapped={false} />
            </mesh>
          ))}

          {/* DC bias electrodes (lower arm) — fixed φ₀ = π */}
          {[bTopY, bBotY].map((y, i) => (
            <RoundedBox key={`b${i}`} args={[bLen, G.padW, 0.045]} radius={0.012} smoothness={2} position={[bCx, y, padZ]}>
              <meshStandardMaterial color={pal.biasMetal} metalness={0.9} roughness={0.5} envMap={env} envMapIntensity={0.6} />
            </RoundedBox>
          ))}

          {/* light, electrical trace and RF feed — all one draw call */}
          <mesh geometry={ribbonGeo} material={waveMat} renderOrder={2} frustumCulled={false} />
          {/* electric field across the modulated arm */}
          <mesh geometry={fieldGeo} material={fieldMat} renderOrder={4} frustumCulled={false} />

          {/* laser */}
          <RoundedBox args={[0.5, 0.36, 0.26]} radius={0.04} smoothness={3} position={[G.xLaser - 0.25, 0, 0.02]}>
            <meshStandardMaterial color={pal.housing} metalness={0.7} roughness={0.38} envMap={env} />
          </RoundedBox>
          <mesh position={[G.xLaser - 0.36, 0.1, 0.155]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshBasicMaterial color={PHOTONIC} toneMapped={false} />
          </mesh>
          <sprite position={[G.xLaser + 0.01, 0, 0.06]} scale={[0.3, 0.3, 1]} renderOrder={5}>
            <spriteMaterial {...sprite} color={pal.gold} opacity={0.8} />
          </sprite>

          {/* splitter / combiner junctions */}
          <sprite position={[G.xS0, 0, 0.06]} scale={[0.22, 0.22, 1]} renderOrder={5}>
            <spriteMaterial {...sprite} color={pal.gold} opacity={0.35} />
          </sprite>
          <sprite ref={combinerRef} position={[G.xC1, 0, 0.07]} renderOrder={5}>
            <spriteMaterial {...sprite} color={pal.hot} opacity={0} />
          </sprite>
          {[1, -1].map((sgn, i) => (
            <sprite key={`l${i}`} ref={(el) => { leakRefs.current[i] = el; }}
              position={[G.xC1 + 0.24, sgn * 0.12, 0.05]} scale={[0.62, 0.11, 1]} renderOrder={5}>
              <spriteMaterial {...sprite} color={pal.gold} opacity={0} rotation={sgn * 0.42} />
            </sprite>
          ))}

          {/* output fiber + the optical bits riding it */}
          <mesh position={[G.xChip + fiberLen / 2, 0, 0.024]} rotation={[0, 0, Math.PI / 2]} renderOrder={1}>
            <cylinderGeometry args={[0.05, 0.05, fiberLen, 20, 1, true]} />
            <meshStandardMaterial color={pal.fiber} transparent opacity={0.16} roughness={0.15} envMap={env}
              depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[G.xChip, 0, 0.024]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.06, 0.008, 8, 28]} />
            <meshStandardMaterial color={pal.metal} metalness={1} roughness={0.3} envMap={env} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <sprite key={`p${i}`} ref={(el) => { pulseRefs.current[i] = el; }} scale={[0.34, 0.24, 1]} renderOrder={6}>
              <spriteMaterial {...sprite} color={pal.hot} opacity={0} />
            </sprite>
          ))}

          {/* labels */}
          <Tag fontScale={fs} position={[G.xLaser - 0.1, -0.33, 0.1]} color={pal.text}>{labels.laser}</Tag>
          <Tag fontScale={fs} position={[G.tickerX0 + 0.42, G.tickerY + 0.24, 0.03]} color={pal.cyanCss}>{labels.dataIn}</Tag>
          <Tag fontScale={fs} position={[G.xChip + 0.36, 0.27, 0.06]} color={PHOTONIC}>{labels.out}</Tag>
          <Tag fontScale={fs} position={[eCx, G.H + G.gap + G.padW + 0.1, 0.05]} color={pal.text} weight={600} spacing="0.04em" size={10}>
            {labels.rf}
          </Tag>
          <Tag fontScale={fs} position={[bCx, -G.H - G.gap - G.padW - 0.1, 0.05]} color={pal.dim} weight={600} spacing="0.04em" size={10}>
            {labels.bias}
          </Tag>
          <DigitPool count={6} slots={eSlots} fontScale={fs} />
          <DigitPool count={4} slots={oSlots} fontScale={fs} />
        </group>
      </group>
    </group>
  );
}

function paintDigit(span, n, vis, on, glow, off) {
  if (span.__n !== n) {
    span.__n = n;
    const b = bitAt(n);
    span.textContent = String(b);
    span.style.color = b ? on : off;
    span.style.textShadow = b ? glow : "none";
  }
  span.style.opacity = vis.toFixed(3);
}

/* Sparkle sprites — drawn once per theme, then stamped with drawImage. */
function makeSprite(draw) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  draw(c.getContext("2d"), 32);
  return c;
}
// round glint: bright core, soft halo
function glowSprite(glow, core) {
  return makeSprite((g, h) => {
    const grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0,    `rgba(${core}, 1)`);
    grad.addColorStop(0.14, `rgba(${core}, 0.9)`);
    grad.addColorStop(0.32, `rgba(${glow}, 0.4)`);
    grad.addColorStop(1,    `rgba(${glow}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, h * 2, h * 2);
  });
}
// 4-point star: small halo + two thin tapered arms
function starSprite(glow, core) {
  return makeSprite((g, h) => {
    const halo = g.createRadialGradient(h, h, 0, h, h, h * 0.45);
    halo.addColorStop(0, `rgba(${core}, 0.9)`);
    halo.addColorStop(1, `rgba(${glow}, 0)`);
    g.fillStyle = halo;
    g.fillRect(0, 0, h * 2, h * 2);

    const arm = g.createRadialGradient(h, h, 0, h, h, h);
    arm.addColorStop(0,    `rgba(${core}, 1)`);
    arm.addColorStop(0.35, `rgba(${glow}, 0.55)`);
    arm.addColorStop(1,    `rgba(${glow}, 0)`);
    g.fillStyle = arm;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      g.beginPath();
      g.moveTo(h - dx * h, h - dy * h);
      g.lineTo(h + dy * 1.6, h - dx * 1.6);
      g.lineTo(h + dx * h, h + dy * h);
      g.lineTo(h - dy * 1.6, h + dx * 1.6);
      g.closePath();
      g.fill();
    }
  });
}
function buildSparkSprites(dark) {
  const p = dark ? SPARK_COLORS.dark : SPARK_COLORS.light;
  return {
    dotGold:   glowSprite(...p.gold),
    dotGlint:  glowSprite(...p.glint),
    starGold:  starSprite(...p.gold),
    starGlint: starSprite(...p.glint),
  };
}

/* Hover sparkles: the cursor sheds tiny glints anywhere over the scene.
   The backdrop is pointer-events: none, so we listen on its parent
   (.scene-inner) — hovering the text, the 3D canvas or empty space all
   count. Everything is drawn on one <canvas>; the loop runs only while
   the cursor is in the scene or sparkles are still fading out.
   No React re-renders. */
function useSparkles(canvasRef, isDark) {
  const darkRef = useRef(isDark);
  useEffect(() => { darkRef.current = isDark; }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bg = canvas?.parentElement;   // .holo-bg
    const host = bg?.parentElement;     // .scene-inner — receives the pointer
    const ctx = canvas?.getContext("2d");
    if (!canvas || !bg || !host || !ctx) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sprites = {};
    const spritesFor = (dark) => (sprites[dark] ??= buildSparkSprites(dark));
    const rand = (a, b) => a + Math.random() * (b - a);
    const clampV = (v) => Math.max(-1200, Math.min(1200, v));

    let dpr = 1;
    const resize = () => {
      const r = bg.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(bg);

    const parts = [];
    let raf = 0, lastFrame = 0;
    let inside = false, idle = 0, travel = 0;
    let px = 0, py = 0, lastT = 0;      // last cursor position (backdrop px) and time

    const emit = (x, y, cvx, cvy, spread) => {
      if (parts.length >= SPARK.max) parts.shift();
      const star = Math.random() < SPARK.starChance;
      const a = Math.random() * Math.PI * 2;
      const speed = rand(8, 40);
      parts.push({
        x: x + rand(-spread, spread),
        y: y + rand(-spread, spread),
        vx: Math.cos(a) * speed + cvx * 0.12,       // a little of the cursor's momentum
        vy: Math.sin(a) * speed + cvy * 0.12 - 12,  // small upward kick before they fall
        age: 0,
        life: rand(SPARK.life[0], SPARK.life[1]),
        size: star ? rand(9, 18) : rand(3, 8),
        star,
        glint: Math.random() < 0.45,                 // white (dark mode) / deep amber (light)
        rot: Math.random() * Math.PI,
        spin: rand(-2, 2),
        tw: rand(8, 18),                             // twinkle speed
        phase: Math.random() * Math.PI * 2,
      });
    };

    const frame = (t) => {
      const dt = Math.max(0, Math.min((t - lastFrame) / 1000, 0.05));
      lastFrame = t;

      if (inside) {                                  // gentle trickle while resting
        idle += dt * SPARK.idleRate;
        while (idle >= 1) { idle -= 1; emit(px, py, 0, 0, 22); }
      }

      const dark = darkRef.current;
      const sp = spritesFor(dark);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      const damp = Math.exp(-SPARK.drag * dt);
      let n = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) continue;               // dead → dropped
        p.vx *= damp;
        p.vy = p.vy * damp + SPARK.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;

        const k = p.age / p.life;
        const env = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;  // pop in, fade out
        const twinkle = 0.5 + 0.5 * Math.sin(p.phase + p.age * p.tw);
        ctx.globalAlpha = env * (0.35 + 0.65 * twinkle);
        const s = p.size * (1 - 0.4 * k);
        const img = p.star
          ? (p.glint ? sp.starGlint : sp.starGold)
          : (p.glint ? sp.dotGlint : sp.dotGold);
        const c = Math.cos(p.rot) * dpr;
        const si = Math.sin(p.rot) * dpr;
        ctx.setTransform(c, si, -si, c, p.x * dpr, p.y * dpr);
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        parts[n++] = p;
      }
      parts.length = n;
      ctx.globalAlpha = 1;

      raf = n > 0 || inside ? requestAnimationFrame(frame) : 0;
    };

    const start = () => {
      if (!raf) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e) => {
      if (e.pointerType === "touch" || reduceMotion.matches) return;
      const r = bg.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (!inside) {                                 // entering: start the trail right here
        inside = true;
        px = x; py = y; lastT = e.timeStamp; travel = 0;
      }
      const dx = x - px;
      const dy = y - py;
      const secs = Math.max((e.timeStamp - lastT) / 1000, 0.001);
      const cvx = clampV(dx / secs);
      const cvy = clampV(dy / secs);

      travel += Math.hypot(dx, dy);
      const count = Math.min(Math.floor(travel / SPARK.spacing), 10);
      travel %= SPARK.spacing;
      for (let i = 1; i <= count; i++) {             // spread along the path, not in clumps
        const f = i / count;
        emit(px + dx * f, py + dy * f, cvx, cvy, 5);
      }

      px = x; py = y; lastT = e.timeStamp;
      start();
    };

    const onLeave = () => { inside = false; idle = 0; };  // existing sparkles finish fading

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [canvasRef]);
}

function HoloBackground() {
  const { isDark } = useTheme();
  const sparkRef = useRef(null);
  useSparkles(sparkRef, isDark);

  return (
    <div className={`holo-bg ${isDark ? "holo-dark" : "holo-light"}`} aria-hidden="true">
      <div className="holo-graticule" />
      <div className="holo-reflect" />
      <div className="holo-beam">            {/* the ONE animated carrier */}
        <div className="holo-beam-shadow" /> {/* reflection: same parent → same tilt, same position, same clock */}
        <div className="holo-beam-bar" />    {/* the shiny inclined bar, drawn over its reflection */}
      </div>
      <div className="holo-grain" />
      <div className="holo-vignette" />
      <canvas ref={sparkRef} className="holo-sparkle" /> {/* hover sparkles — on top so they stay crisp */}
    </div>
  );
}

function Visual({ speed = 1 }) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const labels = useMemo(() => ({
    laser: t("scene3.mzm.laser", "CW LASER"),
    dataIn: t("scene3.mzm.dataIn", "DATA IN"),
    out: t("scene3.mzm.out", "OPTICAL OUT"),
    rf: t("scene3.mzm.rf", "Δφ = π·V/Vπ"),
    bias: t("scene3.mzm.bias", "φ₀ = π  bias"),
  }), [t]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        flat
        camera={{ position: [0, 0, 6.2], fov: 35 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={isDark ? 0.35 : 0.8} />
        <directionalLight position={[-2, 3, 5]} intensity={isDark ? 0.9 : 1.2} />
        <ModulatorScene speed={speed} isDark={isDark} labels={labels} />
      </Canvas>
    </div>
  );
}

export default function Scene3({ active, speed = 1 }) {
  const { t } = useTranslation();

  return (
    <div className="scene-inner">
      <HoloBackground />
      <div className="split">
        <div className="visual-pane">
          <div className="instrument-frame">
            {active ? <Visual speed={speed} /> : null}
          </div>
        </div>
        <div className="scene-text">
          <span className="eyebrow stroke-hair">
            <span className="eyebrow-dot" style={{ background: PHOTONIC }} />
            {t("scene3.eyebrow")}
          </span>
          <div className="letter-block" style={{ margin: "10px 0 20px" }}>
            <span className="letter-giant stroke-lg" style={{ color: PHOTONIC }}>
              P
            </span>
            <span className="letter-suffix stroke-sm">hotonic</span>
          </div>
          <br />
          <p className="body-line" style={{ maxWidth: "38ch" }}>
            {t("scene3.description")}
          </p>
        </div>
      </div>
    </div>
  );
}