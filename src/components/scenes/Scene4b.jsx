import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/Scene4.css";

const THERMO = "#e8690a";
const COOL = "#1c3d49";
const HOT = "#fff2c8";
const MIN_COLOR = "#5fd8ff";
const MAX_COLOR = "#ffb454";

const LANDSCAPE_EXTENT = 2.2;
const SEGMENTS = 60;
const PARTICLE_COUNT = 3;
const TRAIL_LENGTH = 28;

// --- Energy landscape definition -------------------------------------
// A winding valley channel (base) plus a handful of wells (minima) sunk
// into it and peaks (mountains, maxima) rising around its rim. The
// deepest well is the absolute minimum, the tallest peak the absolute
// maximum; everything else is a local min/max the walkers can get
// trapped in before a thermal kick frees them.

function baseSurface(x, z) {
  const bowl = 0.05 * (x * x + z * z);
  const channelX = 0.6 * Math.sin(z * 0.85);
  const dx = x - channelX;
  const channel = -0.6 * Math.exp(-(dx * dx) / (2 * 0.55 * 0.55));
  return bowl + channel - 0.1;
}

function rugged(x, z) {
  return (
    0.035 * Math.sin(x * 5.5 + z * 1.5) * Math.cos(z * 4.7 - x * 1.1) +
    0.018 * Math.sin(x * 11.0 - z * 8.0)
  );
}

const WELLS = [
  { x: -0.25, z: 0.05, s: 0.55, d: 1.25, id: "well-global" },
  { x: 1.2, z: 0.95, s: 0.32, d: 0.5, id: "well-a" },
  { x: -1.15, z: 0.7, s: 0.3, d: 0.42, id: "well-b" },
  { x: 0.35, z: -1.25, s: 0.34, d: 0.46, id: "well-c" },
];

const PEAKS = [
  { x: 1.65, z: -0.35, s: 0.5, h: 1.5, id: "peak-global" },
  { x: -1.7, z: -0.25, s: 0.42, h: 0.8, id: "peak-a" },
  { x: 0.55, z: 1.55, s: 0.4, h: 0.9, id: "peak-b" },
  { x: -0.5, z: 1.7, s: 0.35, h: 0.65, id: "peak-c" },
];

function heightAt(x, z) {
  let h = baseSurface(x, z);
  for (const w of WELLS) {
    const dx = x - w.x;
    const dz = z - w.z;
    h -= w.d * Math.exp(-(dx * dx + dz * dz) / (2 * w.s * w.s));
  }
  for (const p of PEAKS) {
    const dx = x - p.x;
    const dz = z - p.z;
    h += p.h * Math.exp(-(dx * dx + dz * dz) / (2 * p.s * p.s));
  }
  return h + rugged(x, z);
}

function gradAt(x, z) {
  const eps = 0.015;
  const dhdx = (heightAt(x + eps, z) - heightAt(x - eps, z)) / (2 * eps);
  const dhdz = (heightAt(x, z + eps) - heightAt(x, z - eps)) / (2 * eps);
  return [dhdx, dhdz];
}

const GLOBAL_MIN_WELL = WELLS.reduce((a, b) => (b.d > a.d ? b : a), WELLS[0]);
const GLOBAL_MAX_PEAK = PEAKS.reduce((a, b) => (b.h > a.h ? b : a), PEAKS[0]);

const MIN_H = heightAt(GLOBAL_MIN_WELL.x, GLOBAL_MIN_WELL.z) - 0.05;
const MAX_H = heightAt(GLOBAL_MAX_PEAK.x, GLOBAL_MAX_PEAK.z) + 0.05;

const CRITICAL_POINTS = [
  ...WELLS.map((w) => ({
    x: w.x,
    z: w.z,
    kind: "min",
    isGlobal: w.id === GLOBAL_MIN_WELL.id,
  })),
  ...PEAKS.map((p) => ({
    x: p.x,
    z: p.z,
    kind: "max",
    isGlobal: p.id === GLOBAL_MAX_PEAK.id,
  })),
];

// --- Color mapping ------------------------------------------------------

const _cool = new THREE.Color(COOL);
const _mid = new THREE.Color(THERMO);
const _hot = new THREE.Color(HOT);
const _tmpColor = new THREE.Color();

function heightColor(h, target = new THREE.Color()) {
  const t = THREE.MathUtils.clamp((h - MIN_H) / (MAX_H - MIN_H), 0, 1);
  target.copy(_cool).lerp(_mid, THREE.MathUtils.smoothstep(t, 0.0, 0.5));
  target.lerp(_hot, THREE.MathUtils.smoothstep(t, 0.5, 1.0));
  return target;
}

// --- Terrain mesh ---------------------------------------------------------

const TERRAIN_VERTEX_SHADER = /* glsl */ `
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TERRAIN_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform float uTime;
  void main() {
    vec3 lightDir = normalize(vec3(0.4, 0.9, 0.35));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float shimmer = 1.0 + 0.04 * sin(uTime * 1.2 + vPos.x * 2.0 + vPos.z * 2.0);
    vec3 col = vColor * (0.5 + diff * 0.7) * shimmer;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function useTerrainGeometry() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      LANDSCAPE_EXTENT * 2,
      LANDSCAPE_EXTENT * 2,
      SEGMENTS,
      SEGMENTS
    );
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      heightColor(h, _tmpColor);
      colors[i * 3] = _tmpColor.r;
      colors[i * 3 + 1] = _tmpColor.g;
      colors[i * 3 + 2] = _tmpColor.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
}

function Terrain() {
  const geo = useTerrainGeometry();
  const matRef = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => {
      reducedMotion.current = e.matches;
    };
    reducedMotion.current = mq.matches;
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const reducedMotion = useRef(false);

  useFrame((state) => {
    if (reducedMotion.current) return;
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <group>
      <mesh geometry={geo}>
        <shaderMaterial
          ref={matRef}
          vertexShader={TERRAIN_VERTEX_SHADER}
          fragmentShader={TERRAIN_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>
      <mesh geometry={geo} position={[0, 0.004, 0]}>
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.045} />
      </mesh>
    </group>
  );
}

// --- Critical point markers (absolute/local min & max) -------------------

function makeLabelTexture(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "600 30px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function MarkerPin({ x, z, kind, isGlobal }) {
  const y = heightAt(x, z);
  const color = kind === "min" ? MIN_COLOR : MAX_COLOR;
  const label = isGlobal
    ? kind === "min"
      ? "Absolute Min"
      : "Absolute Max"
    : kind === "min"
    ? "local min"
    : "local max";

  const stickHeight = isGlobal ? 0.42 : 0.24;
  const sphereR = isGlobal ? 0.05 : 0.03;

  const texture = useMemo(
    () => makeLabelTexture(label, isGlobal ? color : "#c9c9c9"),
    [label, color, isGlobal]
  );

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.001, 0]}>
        <sphereGeometry args={[sphereR, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isGlobal ? 0.9 : 0.4}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, stickHeight / 2, 0]}>
        <cylinderGeometry args={[0.003, 0.003, stickHeight, 6]} />
        <meshBasicMaterial color={color} transparent opacity={isGlobal ? 0.85 : 0.4} />
      </mesh>
      <sprite
        position={[0, stickHeight + (isGlobal ? 0.09 : 0.05), 0]}
        scale={isGlobal ? [0.62, 0.16, 1] : [0.34, 0.09, 1]}
      >
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

function CriticalPointMarkers() {
  return (
    <group>
      {CRITICAL_POINTS.map((p, i) => (
        <MarkerPin key={i} x={p.x} z={p.z} kind={p.kind} isGlobal={p.isGlobal} />
      ))}
    </group>
  );
}

// --- Floating formula label ----------------------------------------------

function makeFormulaTexture(formula, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // Dark semi-transparent backing for readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 16);
  ctx.fill();

  ctx.font = "italic 600 42px 'Times New Roman', Georgia, serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formula, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function FormulaLabel() {
  const formula = "g̃ = F⁻¹ ∇l(θ)";
  const texture = useMemo(() => makeFormulaTexture(formula, "#ffffff"), []);

  const groupRef = useRef();
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => {
      reducedMotion.current = e.matches;
    };
    reducedMotion.current = mq.matches;
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const reducedMotion = useRef(false);

  useFrame((state) => {
    if (reducedMotion.current) return;
    // Gentle bobbing
    if (groupRef.current) {
      groupRef.current.position.y = 2.1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={[0, 2.1, 0]}>
      <sprite scale={[1.6, 0.4, 1]}>
        <spriteMaterial
          map={texture}
          transparent
          depthWrite={false}
          opacity={0.95}
        />
      </sprite>
    </group>
  );
}

// --- Ensemble of walkers doing thermodynamic gradient descent -----------
// Each step follows the local gradient (steepest descent) plus a
// breathing thermal-noise term, so walkers periodically escape shallow
// local wells before settling into deeper basins - ideally the global one.

function GradientWalkers() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
        const r = 1.3 + Math.random() * 0.5;
        return {
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r,
          trail: new Float32Array(TRAIL_LENGTH * 3),
          trailColors: new Float32Array(TRAIL_LENGTH * 3),
          filled: 0,
          seed: Math.random() * 100,
        };
      }),
    []
  );

  const sphereRefs = useRef([]);
  const lineGeomRefs = useRef([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => {
      reducedMotion.current = e.matches;
    };
    reducedMotion.current = mq.matches;
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const reducedMotion = useRef(false);

  useFrame((state, delta) => {
    if (reducedMotion.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const stepSize = 0.3;
    const maxGrad = 3.0;
    const bound = LANDSCAPE_EXTENT * 0.97;

    particles.forEach((p, i) => {
      const temp = 0.5 + 0.5 * Math.sin(t * 0.18 + p.seed);
      let [gx, gz] = gradAt(p.x, p.z);
      const gmag = Math.hypot(gx, gz);
      if (gmag > maxGrad) {
        gx = (gx / gmag) * maxGrad;
        gz = (gz / gmag) * maxGrad;
      }
      const noiseX = Math.sin(t * 3.1 + p.seed * 7.7) + Math.sin(t * 5.3 + p.seed * 2.1);
      const noiseZ = Math.cos(t * 2.7 + p.seed * 4.4) + Math.cos(t * 4.6 + p.seed * 9.3);
      const noiseAmp = 0.2 * temp;

      p.x += (-gx * stepSize + noiseX * noiseAmp) * dt;
      p.z += (-gz * stepSize + noiseZ * noiseAmp) * dt;
      p.x = THREE.MathUtils.clamp(p.x, -bound, bound);
      p.z = THREE.MathUtils.clamp(p.z, -bound, bound);

      const h = heightAt(p.x, p.z);
      const y = h + 0.045;

      const sphere = sphereRefs.current[i];
      if (sphere) {
        sphere.position.set(p.x, y, p.z);
        heightColor(h, sphere.material.color);
        sphere.material.emissive.copy(sphere.material.color).multiplyScalar(0.7);
      }

      const arr = p.trail;
      const carr = p.trailColors;
      arr.copyWithin(0, 3);
      carr.copyWithin(0, 3);
      const last = (TRAIL_LENGTH - 1) * 3;
      arr[last] = p.x;
      arr[last + 1] = y;
      arr[last + 2] = p.z;
      heightColor(h, _tmpColor);
      carr[last] = _tmpColor.r;
      carr[last + 1] = _tmpColor.g;
      carr[last + 2] = _tmpColor.b;
      if (p.filled < TRAIL_LENGTH) p.filled += 1;

      const geom = lineGeomRefs.current[i];
      if (geom) {
        geom.attributes.position.needsUpdate = true;
        geom.attributes.color.needsUpdate = true;
        geom.setDrawRange(TRAIL_LENGTH - p.filled, p.filled);
      }
    });
  });

  return (
    <group>
      {particles.map((p, i) => (
        <line key={`trail-${i}`}>
          <bufferGeometry ref={(g) => (lineGeomRefs.current[i] = g)}>
            <bufferAttribute
              attach="attributes-position"
              count={TRAIL_LENGTH}
              array={p.trail}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={TRAIL_LENGTH}
              array={p.trailColors}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
      {particles.map((_, i) => (
        <mesh key={`walker-${i}`} ref={(m) => (sphereRefs.current[i] = m)}>
          <icosahedronGeometry args={[0.05, 1]} />
          <meshStandardMaterial
            color={THERMO}
            emissive={THERMO}
            emissiveIntensity={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function DescentScene() {
  const rootRef = useRef();
  const reducedMotion = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => {
      reducedMotion.current = e.matches;
    };
    reducedMotion.current = mq.matches;
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useFrame((state, delta) => {
    if (reducedMotion.current) return;
    state.camera.lookAt(0, 0.15, 0);
    if (rootRef.current) rootRef.current.rotation.y += delta * 0.1;
  });
  return (
    <group ref={rootRef}>
      <Terrain />
      <CriticalPointMarkers />
      <GradientWalkers />
      <FormulaLabel />
    </group>
  );
}
function FormulaCard() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "14px",
        left: "14px",
        background: "rgba(10, 12, 18, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "14px 18px",
        fontFamily: "'Times New Roman', Times, serif",
        color: "#e2e8f0",
        lineHeight: 1.5,
        pointerEvents: "none",
        userSelect: "none",
        maxWidth: "320px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: THERMO,
          marginBottom: "6px",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
        }}
      >
        Ising Energy
      </div>
      <div style={{ fontSize: "17px" }}>
        E(<b>s</b>) = − Σ<sub>i&lt;j</sub> J<sub>ij</sub> s<sub>i</sub> s<sub>j</sub>
        &nbsp;−&nbsp; Σ<sub>i</sub> h<sub>i</sub> s<sub>i</sub>
      </div>
    </div>
  );
}
function Visual({ active }) {
  const { isDark } = useTheme();
  return (
    <Canvas frameloop={active ? "always" : "demand"} camera={{ position: [0, 3.1, 4.7], fov: 44 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.45 : 0.85} />
      <pointLight position={[3, 3.5, 2.5]} intensity={0.7} color={THERMO} />
      <pointLight position={[-3, 2, -2.5]} intensity={0.25} color="#5fd8ff" />
      <DescentScene />
    </Canvas>
  );
}


// --- Thermal gradient background ---------------------------------------------
// Whole-slide heat field with a fixed hexagon grid, all drawn by one WebGL
// canvas (no CSS blend layers, so the browser only composites one plain
// opaque layer - cheap during slide transitions).
//
//   pass 1  field    domain-warped noise -> temperature -> colour ramp, at
//                    1/4 resolution into a texture (it is all soft gradients)
//   pass 2  compose  upsample the field, draw the fixed hex grid tinted by
//                    the heat under it, calm the text side, dither
//
// Hot and cold regions drift and slowly trade places. Under the cursor a hot
// core with a cold rim follows the pointer, stretching into a short comet
// while it moves. Colours, grid and veil come from the --s4-* variables in
// Scene4.css, so both themes are tuned there.
//
// Performance: the canvas is created and the shaders compiled in idle time
// (async compile where the browser supports it), drift renders at 30 fps and
// only cursor activity runs at full rate, and nothing renders while the slide
// is inactive.
// This block is identical in Scene4a.jsx and Scene4b.jsx.

const HEAT_FIELD_SCALE = 0.25; // field pass: pixels per CSS px
const HEAT_FIELD_MAX = 320000; // field pass pixel cap
const HEAT_COMP_MAX_DPR = 1.5; // compose pass: max device-pixel ratio
const HEAT_COMP_MAX = 3200000; // compose pass pixel cap
const HEAT_IDLE_FPS = 30; // drift-only frame rate

// Used only when a CSS variable is missing (mirror of Scene4.css).
const HEAT_DEFAULTS = {
  dark: {
    c: ["#050404", "#0d0706", "#2a0c05", "#e8690a", "#ffd2a6"],
    gridLine: "#ffffff",
    gridBase: "#2a1206",
    gridOpacity: 0.4,
    gridBlend: "overlay",
    veilMode: "multiply",
    veilTint: "#26120b",
    veilColor: "#0a0a0b",
    veilStrength: 1,
    veilFrom: 0.3,
    veilTo: 0.68,
  },
  light: {
    c: ["#fffaf6", "#ffe6d2", "#ffc293", "#ff9147", "#e8690a"],
    gridLine: "#e8690a",
    gridBase: "#000000",
    gridOpacity: 0.4,
    gridBlend: "multiply",
    veilMode: "fade",
    veilTint: "#ffffff",
    veilColor: "#f7f6f3",
    veilStrength: 0.68,
    veilFrom: 0.3,
    veilTo: 0.68,
  },
};

const HEAT_VERT = /* glsl */ `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const HEAT_FIELD_FRAG = /* glsl */ `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;   // cursor, 0..1, y up
  uniform vec2  uTrail;   // lagging copy of the cursor
  uniform float uHover;   // 0..1
  uniform vec3  uC0;      // coldest
  uniform vec3  uC1;
  uniform vec3  uC2;      // middle
  uniform vec3  uC3;
  uniform vec3  uC4;      // hottest

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash2(i), f);
    float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = r * p * 1.97 + vec2(11.3, 7.1);
      a *= 0.42;
    }
    return v;
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = r * p * 2.03 + vec2(11.3, 7.1);
      a *= 0.5;
    }
    return v;
  }

  vec3 ramp(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.3, t));
    c = mix(c, uC2, smoothstep(0.22, 0.52, t));
    c = mix(c, uC3, smoothstep(0.48, 0.78, t));
    return mix(c, uC4, smoothstep(0.74, 1.0, t));
  }

  void main() {
    vec2 uv  = gl_FragCoord.xy / uRes;
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 p   = (uv - 0.5) * asp;
    vec2 m   = (uMouse - 0.5) * asp;
    vec2 tr  = (uTrail - 0.5) * asp;
    float t  = uTime;

    /* distance to the comet segment trail -> cursor */
    vec2 pa = p - tr;
    vec2 ba = m - tr;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    float d = length(pa - ba * h);

    /* convection: the field twists around the cursor */
    float sw = uHover * 0.9 * exp(-d * d * 26.0);
    float cs = cos(sw);
    float sn = sin(sw);
    vec2 rel = p - m;
    vec2 ps = m + vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y);

    /* ambient field: domain-warped noise drifting in several directions */
    vec2 s = ps * 1.2;
    vec2 q = vec2(fbm(s + t * vec2(0.034, 0.019)),
                  fbm(s + vec2(5.2, 1.3) - t * vec2(0.021, 0.03)));
    vec2 r = vec2(fbm(s + 2.1 * q + vec2(1.7, 9.2) + t * 0.047),
                  fbm(s + 2.1 * q + vec2(8.3, 2.8) - t * 0.04));
    float f = fbm(s + 1.6 * r);

    /* slow tide so hot and cold regions trade places across the slide */
    float tide = 0.5 * sin(t * 0.055 + p.x * 1.3 - p.y * 0.9)
               + 0.5 * sin(t * 0.041 - p.x * 0.8 + p.y * 1.5 + 1.7);

    float temp = 0.5 + f * 1.4 + tide * 0.2;

    /* soft ceiling: the drifting field tops out at bright orange, so the
       palest hot colour is reserved for the cursor */
    if (temp > 0.72) temp = 0.72 + (temp - 0.72) * 0.3;

    /* cursor: hot core, cold rim, edges wobble with the field */
    float R = 0.13;
    float dd = d + fbm3(p * 4.0 + t * 0.3) * 0.06;
    float core = exp(-(dd * dd) / (R * R)) * mix(0.6, 1.0, h);
    float x = (dd - R * 1.55) / (R * 0.6);
    float rim = exp(-x * x);
    temp += uHover * (0.85 * core - 0.38 * rim);

    gl_FragColor = vec4(ramp(temp), 1.0);
  }
`;

const HEAT_COMP_FRAG = /* glsl */ `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform sampler2D uField;
  uniform vec2  uRes;          // canvas pixels
  uniform float uScale;        // canvas pixels per CSS pixel
  uniform float uHexSide;      // hexagon side, CSS px
  uniform vec3  uGridLine;
  uniform vec3  uGridBase;
  uniform float uGridOpacity;
  uniform float uGridMode;     // 0 overlay, 1 multiply
  uniform vec3  uVeilTint;
  uniform vec3  uVeilColor;
  uniform float uVeilMode;     // 0 multiply by tint, 1 fade to colour
  uniform float uVeilStrength;
  uniform vec2  uVeilRange;    // fade from .. to, as a fraction of the width

  /* distance (CSS px) to the nearest edge of a flat-top honeycomb */
  float hexEdge(vec2 p) {
    float k = 1.7320508 * uHexSide;
    vec2 q = p.yx / k;
    vec2 s = vec2(1.0, 1.7320508);
    vec4 c = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h = vec4(q - c.xy * s, q - (c.zw + 0.5) * s);
    vec2 l = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw;
    l = abs(l);
    return (0.5 - max(dot(l, s * 0.5), l.x)) * k;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec3 col = texture2D(uField, uv).rgb;

    /* fixed grid, anchored to the top-left corner, 1 CSS px lines */
    vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
    float d = hexEdge(p) * uScale;
    float w = 0.5 * uScale;
    float line = 1.0 - smoothstep(w - 0.6, w + 0.6, d);
    vec3 over = mix(2.0 * col * uGridLine,
                    1.0 - 2.0 * (1.0 - col) * (1.0 - uGridLine),
                    step(0.5, col));
    vec3 tinted = mix(over, col * uGridLine, uGridMode);
    col = mix(col, tinted, line * uGridOpacity) + uGridBase * line;

    /* calm the text side: multiply along a warm curve (stays saturated,
       never greys) or fade to a colour */
    float vm = (1.0 - smoothstep(uVeilRange.x, uVeilRange.y, uv.x)) * uVeilStrength;
    vec3 darkened = col * pow(max(uVeilTint, vec3(0.001)), vec3(vm));
    vec3 faded = mix(col, uVeilColor, vm);
    col = mix(darkened, faded, uVeilMode);

    /* dither against banding */
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function parseHexColor(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value || "").trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Any CSS colour (hex, rgb(), named...) -> [r, g, b] in 0..1, or null.
let heatColorCtx = null;
function parseCssColor(value) {
  const v = (value || "").trim();
  if (!v) return null;
  const hex = parseHexColor(v);
  if (hex) return hex;
  if (heatColorCtx === null) {
    heatColorCtx = document.createElement("canvas").getContext("2d") || false;
  }
  if (!heatColorCtx) return null;
  heatColorCtx.fillStyle = "#010203";
  heatColorCtx.fillStyle = v;
  const out = heatColorCtx.fillStyle;
  if (out === "#010203") return null; // not a colour
  if (out[0] === "#") return parseHexColor(out);
  const m = /rgba?\(([^)]+)\)/.exec(out);
  if (!m) return null;
  const [r, g, b] = m[1].split(",").map(parseFloat);
  return [r / 255, g / 255, b / 255];
}

function HeatBackground({ active, isDark }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const activeRef = useRef(active);
  const darkRef = useRef(isDark);
  const kickRef = useRef(() => {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    const s = {
      clientX: 0,
      clientY: 0,
      hasPointer: false,
      lastInput: 0,
      px: 0.5, py: 0.5, // pointer
      mx: 0.5, my: 0.5, // cursor (fast follow)
      tx: 0.5, ty: 0.5, // trail (slow follow)
      hover: 0,
      time: 40,
      speed: 1,
      hexSide: 26,
      style: null, // flat list of numbers sent to the shaders (see readStyle)
      styleTarget: null,
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;

    let gl = null;
    let ext = null;
    let progField = null;
    let progComp = null;
    let fieldShaders = [];
    let compShaders = [];
    let buf = null;
    let tex = null;
    let fbo = null;
    let locF = {};
    let locC = {};
    let glState = "idle"; // idle | compiling | ready | failed | lost
    let fw = 0;
    let fh = 0;
    let compScale = 1;

    let raf = 0;
    let lastDraw = 0;
    let busy = true;
    let styleDirty = true;
    let ready = false;
    let disposed = false;
    let initHandle = null;

    // --- WebGL setup (programs compile asynchronously where supported)
    const buildProgram = (fragSrc, list) => {
      const prog = gl.createProgram();
      [
        [gl.VERTEX_SHADER, HEAT_VERT],
        [gl.FRAGMENT_SHADER, fragSrc],
      ].forEach(([type, src]) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        gl.attachShader(prog, sh);
        list.push(sh);
      });
      gl.bindAttribLocation(prog, 0, "aPos");
      gl.linkProgram(prog);
      return prog;
    };

    const beginGL = () => {
      const opts = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      };
      gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
      if (!gl || gl.isContextLost()) return false;
      ext = gl.getExtension("KHR_parallel_shader_compile");
      fieldShaders = [];
      compShaders = [];
      progField = buildProgram(HEAT_FIELD_FRAG, fieldShaders);
      progComp = buildProgram(HEAT_COMP_FRAG, compShaders);

      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      tex = gl.createTexture();
      fbo = gl.createFramebuffer();
      fw = 0;
      fh = 0;
      glState = "compiling";
      return true;
    };

    const releaseGL = () => {
      if (gl && !gl.isContextLost()) {
        [progField, progComp].forEach((p) => p && gl.deleteProgram(p));
        [...fieldShaders, ...compShaders].forEach((sh) => gl.deleteShader(sh));
        if (buf) gl.deleteBuffer(buf);
        if (tex) gl.deleteTexture(tex);
        if (fbo) gl.deleteFramebuffer(fbo);
      }
      progField = progComp = buf = tex = fbo = null;
      fieldShaders = [];
      compShaders = [];
    };

    const failGL = () => {
      releaseGL();
      glState = "failed";
      wrap.setAttribute("data-fallback", "");
    };

    // Returns true once both programs are linked and ready to draw.
    const finishGL = () => {
      if (ext) {
        const done = (p) => gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR);
        if (!done(progField) || !done(progComp)) return false; // still compiling, poll next frame
      }
      const linked = (p, list) => {
        if (gl.getProgramParameter(p, gl.LINK_STATUS)) return true;
        console.warn(
          "[Scene4] heat shader:",
          gl.getProgramInfoLog(p),
          ...list.map((sh) => gl.getShaderInfoLog(sh))
        );
        return false;
      };
      if (!linked(progField, fieldShaders) || !linked(progComp, compShaders)) {
        failGL();
        return false;
      }
      [...fieldShaders, ...compShaders].forEach((sh) => gl.deleteShader(sh));
      fieldShaders = [];
      compShaders = [];

      const where = (prog, names) =>
        names.reduce((acc, n) => ({ ...acc, [n]: gl.getUniformLocation(prog, n) }), {});
      locF = where(progField, [
        "uRes", "uTime", "uMouse", "uTrail", "uHover", "uC0", "uC1", "uC2", "uC3", "uC4",
      ]);
      locC = where(progComp, [
        "uField", "uRes", "uScale", "uHexSide", "uGridLine", "uGridBase", "uGridOpacity",
        "uGridMode", "uVeilTint", "uVeilColor", "uVeilMode", "uVeilStrength", "uVeilRange",
      ]);
      gl.useProgram(progComp);
      gl.uniform1i(locC.uField, 0);
      glState = "ready";
      return true;
    };

    // --- sizing: full-res compose canvas, quarter-res field texture
    const size = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      let cs = Math.min(window.devicePixelRatio || 1, HEAT_COMP_MAX_DPR);
      if (w * h * cs * cs > HEAT_COMP_MAX) cs = Math.sqrt(HEAT_COMP_MAX / (w * h));
      const cw = Math.max(2, Math.round(w * cs));
      const ch = Math.max(2, Math.round(h * cs));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      compScale = cw / w;

      if (!gl || !tex || gl.isContextLost()) return;
      let fs = HEAT_FIELD_SCALE;
      if (w * h * fs * fs > HEAT_FIELD_MAX) fs = Math.sqrt(HEAT_FIELD_MAX / (w * h));
      const nfw = Math.max(2, Math.round(w * fs));
      const nfh = Math.max(2, Math.round(h * fs));
      if (nfw === fw && nfh === fh) return;
      fw = nfw;
      fh = nfh;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (!complete) failGL();
    };

    // --- style: CSS variables -> one flat list of numbers
    //  0-14 ramp c0..c4 | 15-17 grid line | 18-20 grid base | 21 grid opacity
    //  22 grid mode | 23-25 veil tint | 26-28 veil colour | 29 veil mode
    //  30 veil strength | 31 veil from | 32 veil to
    const readStyle = () => {
      styleDirty = false;
      const cs = getComputedStyle(wrap);
      const get = (name) => cs.getPropertyValue(name).trim();
      const D = darkRef.current ? HEAT_DEFAULTS.dark : HEAT_DEFAULTS.light;
      const col = (name, def) => parseCssColor(get(name)) || parseCssColor(def);
      const num = (name, def) => {
        const v = parseFloat(get(name));
        return Number.isFinite(v) ? v : def;
      };
      const word = (name, def) => get(name) || def;
      s.styleTarget = [
        ...[0, 1, 2, 3, 4].flatMap((i) => col(`--s4-c${i}`, D.c[i])),
        ...col("--s4-grid-line", D.gridLine),
        ...col("--s4-grid-base", D.gridBase),
        num("--s4-grid-opacity", D.gridOpacity),
        word("--s4-grid-blend", D.gridBlend) === "multiply" ? 1 : 0,
        ...col("--s4-veil-tint", D.veilTint),
        ...col("--s4-veil-color", D.veilColor),
        word("--s4-veil-mode", D.veilMode) === "fade" ? 1 : 0,
        num("--s4-veil-strength", D.veilStrength),
        num("--s4-veil-from", D.veilFrom),
        num("--s4-veil-to", D.veilTo),
      ];
      if (!s.style) s.style = s.styleTarget.slice();
      s.speed = num("--s4-flow-speed", 1);
      s.hexSide = Math.max(6, num("--s4-grid-size", 26));
    };

    const draw = () => {
      if (glState === "ready" && !gl.isContextLost()) {
        const st = s.style;
        // pass 1: field -> texture
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, fw, fh);
        gl.useProgram(progField);
        gl.uniform2f(locF.uRes, fw, fh);
        gl.uniform1f(locF.uTime, s.time);
        gl.uniform2f(locF.uMouse, s.mx, s.my);
        gl.uniform2f(locF.uTrail, s.tx, s.ty);
        gl.uniform1f(locF.uHover, s.hover);
        for (let i = 0; i < 5; i++) {
          gl.uniform3f(locF[`uC${i}`], st[i * 3], st[i * 3 + 1], st[i * 3 + 2]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // pass 2: compose -> canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(progComp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform2f(locC.uRes, canvas.width, canvas.height);
        gl.uniform1f(locC.uScale, compScale);
        gl.uniform1f(locC.uHexSide, s.hexSide);
        gl.uniform3f(locC.uGridLine, st[15], st[16], st[17]);
        gl.uniform3f(locC.uGridBase, st[18], st[19], st[20]);
        gl.uniform1f(locC.uGridOpacity, st[21]);
        gl.uniform1f(locC.uGridMode, st[22]);
        gl.uniform3f(locC.uVeilTint, st[23], st[24], st[25]);
        gl.uniform3f(locC.uVeilColor, st[26], st[27], st[28]);
        gl.uniform1f(locC.uVeilMode, st[29]);
        gl.uniform1f(locC.uVeilStrength, st[30]);
        gl.uniform2f(locC.uVeilRange, st[31], st[32]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (!ready) {
          ready = true;
          wrap.setAttribute("data-ready", "");
        }
      } else {
        // CSS fallback: only the cursor spot needs JS
        wrap.style.setProperty("--s4-mx", `${(s.mx * 100).toFixed(2)}%`);
        wrap.style.setProperty("--s4-my", `${((1 - s.my) * 100).toFixed(2)}%`);
        wrap.style.setProperty("--s4-hover", s.hover.toFixed(3));
      }
    };

    const frame = (now) => {
      raf = 0;
      if (disposed || glState === "idle") return;

      if (glState === "compiling") {
        finishGL();
        if (glState === "compiling") {
          raf = requestAnimationFrame(frame); // keep polling, never blocks
          return;
        }
      }

      // drift alone is slow: 30 fps is enough; cursor activity runs at full rate
      const hot = busy || now - s.lastInput < 300;
      if (!hot && lastDraw && now - lastDraw < 1000 / HEAT_IDLE_FPS - 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = lastDraw ? Math.min((now - lastDraw) / 1000, 0.1) : 1 / 60;
      lastDraw = now;
      const ease = (rate) => 1 - Math.exp(-rate * dt);

      if (styleDirty) readStyle();

      // pointer -> canvas uv (y up); rect is read once per frame
      let target = 0;
      if (s.hasPointer) {
        const rect = wrap.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const u = (s.clientX - rect.left) / rect.width;
          const v = 1 - (s.clientY - rect.top) / rect.height;
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            s.px = u;
            s.py = v;
            target = 1;
          }
        }
      }
      // cursor re-enters: start the spot where the pointer is
      if (target && s.hover < 0.02) {
        s.mx = s.tx = s.px;
        s.my = s.ty = s.py;
      }

      const km = ease(12);
      const kt = ease(2.6);
      s.mx += (s.px - s.mx) * km;
      s.my += (s.py - s.my) * km;
      s.tx += (s.mx - s.tx) * kt;
      s.ty += (s.my - s.ty) * kt;
      s.hover += (target - s.hover) * ease(target > s.hover ? 3.2 : 1.3);

      // theme switch: blend colours instead of snapping
      let styleMoving = false;
      const kp = ease(5);
      for (let i = 0; i < s.style.length; i++) {
        const diff = s.styleTarget[i] - s.style[i];
        if (Math.abs(diff) > 0.002) styleMoving = true;
        s.style[i] += diff * kp;
      }

      if (activeRef.current && !reduced) s.time += dt * s.speed;

      draw();

      const settling =
        styleMoving ||
        Math.abs(target - s.hover) > 0.003 ||
        Math.abs(s.px - s.tx) + Math.abs(s.py - s.ty) > 0.0005;
      busy = settling;
      const flowing = glState === "ready" && !reduced;
      if (activeRef.current && (flowing || settling)) raf = requestAnimationFrame(frame);
    };

    const kick = (restyle) => {
      if (restyle) styleDirty = true;
      if (!raf && !disposed) {
        lastDraw = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    kickRef.current = kick;

    const resize = () => {
      size();
      kick();
    };
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    // --- pointer (window-level, so text and the 3D pane count as hover too)
    const onMove = (e) => {
      s.clientX = e.clientX;
      s.clientY = e.clientY;
      s.hasPointer = true;
      s.lastInput = performance.now();
      if (activeRef.current) kick();
    };
    const onRelease = (e) => {
      if (e.pointerType !== "mouse") {
        s.hasPointer = false;
        kick();
      }
    };
    const onOut = (e) => {
      if (!e.relatedTarget) {
        s.hasPointer = false;
        kick();
      }
    };
    const onBlur = () => {
      s.hasPointer = false;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onRelease, { passive: true });
    window.addEventListener("pointercancel", onRelease, { passive: true });
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);

    const onMotion = (e) => {
      reduced = e.matches;
      kick();
    };
    motionQuery.addEventListener("change", onMotion);

    // --- WebGL context loss: fall back to CSS, recover when restored
    const onLost = (e) => {
      e.preventDefault();
      glState = "lost";
      progField = progComp = buf = tex = fbo = null;
      ready = false;
      wrap.removeAttribute("data-ready");
      wrap.setAttribute("data-fallback", "");
    };
    const onRestored = () => {
      if (beginGL()) {
        wrap.removeAttribute("data-fallback");
        size();
      } else {
        glState = "failed";
      }
      kick(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    // --- start in idle time so mounting never stalls a slide transition
    const init = () => {
      initHandle = null;
      if (disposed) return;
      if (!beginGL()) {
        glState = "failed";
        wrap.setAttribute("data-fallback", "");
      }
      size();
      kick(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(init, { timeout: 300 });
      initHandle = () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(init, 32);
      initHandle = () => clearTimeout(id);
    }

    return () => {
      disposed = true;
      if (initHandle) initHandle();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      kickRef.current = () => {};
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      motionQuery.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      releaseGL();
      glState = "idle";
      wrap.removeAttribute("data-ready");
      wrap.removeAttribute("data-fallback");
      // real unmount (canvas left the page): free the GPU context right away
      // instead of waiting for garbage collection
      const loser = gl && !gl.isContextLost() ? gl.getExtension("WEBGL_lose_context") : null;
      if (loser) {
        setTimeout(() => {
          if (!canvas.isConnected) loser.loseContext();
        }, 0);
      }
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    kickRef.current();
  }, [active]);

  useEffect(() => {
    darkRef.current = isDark;
    kickRef.current(true); // re-read colours on the next frame, after the theme lands
  }, [isDark]);

  return (
    <>
      <div
        ref={wrapRef}
        className={`scene4-heat${active ? "" : " is-paused"}`}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="scene4-heat-canvas" />
      </div>
      <div className="scene4-heat-veil" aria-hidden="true" />
    </>
  );
}

// --- Keep the 3D visual warm ------------------------------------------------
// The 3D canvas used to be created when the slide became active and destroyed
// when it left, so every visit paid for a new WebGL context, shader compiles
// and geometry. Now it mounts once (in idle time, even before the first
// visit) and then only pauses: frameloop "always" while active, "demand"
// (no rendering) while not.
function useWarmMount(active) {
  const [warm, setWarm] = useState(active);
  useEffect(() => {
    if (warm) return undefined;
    if (active) {
      setWarm(true);
      return undefined;
    }
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setWarm(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setWarm(true), 1200);
    return () => clearTimeout(id);
  }, [active, warm]);
  return warm || active;
}


export default function Scene4({ active }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const warm = useWarmMount(active);
  return (
    <div className="scene-inner scene4-root">
      {/* whole-slide thermal background: drifts on its own, heats up under the cursor */}
      <HeatBackground active={active} isDark={isDark} />

      <div className="scene4-content">
        <div className="split">
          <div className="scene-text">
            <span className="eyebrow stroke-hair">
              <span className="eyebrow-dot" style={{ background: THERMO }} />
              {t("scene4.eyebrow")}
            </span>
            <div style={{ margin: "10px 0 20px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "baseline", gap: "0.02em" }}>
              <span className="letter-giant stroke-lg" style={{ color: THERMO, flexShrink: 0 }}>
                T
              </span>
              <span className="letter-suffix stroke-sm" style={{ flexShrink: 0 }}>
                hermodynamic
              </span>
            </div>
            <p className="body-line" style={{ maxWidth: "38ch" }}>
              {t("scene4.description")}
            </p>
          </div>
          <div className="visual-pane">
            <div className="instrument-frame" style={{ position: "relative" }}>
              {warm ? <Visual active={active} /> : null}
              <FormulaCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}