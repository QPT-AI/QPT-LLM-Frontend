import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const THERMO = "#e8690a";
const COOL = "#22434f";
const HOT = "#ffdd9e";

const LANDSCAPE_EXTENT = 1.7;
const SEGMENTS = 96;
const PARTICLE_COUNT = 5;
const TRAIL_LENGTH = 26;
const MIN_H = -1.45;
const MAX_H = -0.05;

// A small energy landscape: one deep global well plus a few shallower
// local wells, so the walkers below can get trapped and thermally
// kicked back out again — the "thermodynamic" part of the descent.
const WELLS = [
  { x: 0, z: 0, s: 0.5, d: 0.95 },
  { x: 0.95, z: 0.55, s: 0.32, d: 0.5 },
  { x: -0.85, z: 0.45, s: 0.3, d: 0.42 },
  { x: 0.15, z: -0.95, s: 0.34, d: 0.46 },
  { x: -0.7, z: -0.75, s: 0.28, d: 0.34 },
];

function heightAt(x, z) {
  let h = 0.16 * (x * x + z * z) - 0.5;
  for (let i = 0; i < WELLS.length; i++) {
    const w = WELLS[i];
    const dx = x - w.x;
    const dz = z - w.z;
    h -= w.d * Math.exp(-(dx * dx + dz * dz) / (2 * w.s * w.s));
  }
  return h;
}

function gradAt(x, z) {
  const eps = 0.015;
  const dhdx = (heightAt(x + eps, z) - heightAt(x - eps, z)) / (2 * eps);
  const dhdz = (heightAt(x, z + eps) - heightAt(x, z - eps)) / (2 * eps);
  return [dhdx, dhdz];
}

const _cool = new THREE.Color(COOL);
const _mid = new THREE.Color(THERMO);
const _hot = new THREE.Color(HOT);
const _tmpColor = new THREE.Color();

function heightColor(h, target = new THREE.Color()) {
  const t = THREE.MathUtils.clamp((h - MIN_H) / (MAX_H - MIN_H), 0, 1);
  target.copy(_cool).lerp(_mid, THREE.MathUtils.smoothstep(t, 0.0, 0.55));
  target.lerp(_hot, THREE.MathUtils.smoothstep(t, 0.55, 1.0));
  return target;
}

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
    float shimmer = 1.0 + 0.05 * sin(uTime * 1.4 + vPos.x * 2.5 + vPos.z * 2.5);
    vec3 col = vColor * (0.55 + diff * 0.65) * shimmer;
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

function GradientLandscape() {
  const geo = useTerrainGeometry();
  const matRef = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((state) => {
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
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

// Ensemble of walkers descending the landscape above: each step follows
// the local gradient (steepest descent) plus a breathing thermal-noise
// term, so they periodically escape shallow local wells before
// re-settling into the deeper basins.
function GradientWalkers() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
        const r = 1.1 + Math.random() * 0.4;
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

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const stepSize = 0.35;
    const bound = LANDSCAPE_EXTENT * 0.97;

    particles.forEach((p, i) => {
      const temp = 0.5 + 0.5 * Math.sin(t * 0.18 + p.seed); // breathing "temperature"
      const [gx, gz] = gradAt(p.x, p.z);
      const noiseX = Math.sin(t * 3.1 + p.seed * 7.7) + Math.sin(t * 5.3 + p.seed * 2.1);
      const noiseZ = Math.cos(t * 2.7 + p.seed * 4.4) + Math.cos(t * 4.6 + p.seed * 9.3);
      const noiseAmp = 0.18 * temp;

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
  useFrame((state, delta) => {
    state.camera.lookAt(0, 0, 0);
    if (rootRef.current) rootRef.current.rotation.y += delta * 0.12;
  });
  return (
    <group ref={rootRef}>
      <GradientLandscape />
      <GradientWalkers />
    </group>
  );
}

function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas camera={{ position: [0, 2.3, 3.3], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.45 : 0.85} />
      <pointLight position={[2.5, 3, 2]} intensity={0.7} color={THERMO} />
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