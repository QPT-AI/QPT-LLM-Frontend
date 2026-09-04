import { useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

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

function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas camera={{ position: [0, 3.1, 4.7], fov: 44 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.45 : 0.85} />
      <pointLight position={[3, 3.5, 2.5]} intensity={0.7} color={THERMO} />
      <pointLight position={[-3, 2, -2.5]} intensity={0.25} color="#5fd8ff" />
      <DescentScene />
    </Canvas>
  );
}

export default function Scene4({ active }) {
  const { t } = useTranslation();
  return (
    <div className="scene-inner">
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
          <div className="instrument-frame">{active ? <Visual /> : null}</div>
        </div>
      </div>
    </div>
  );
}