import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const THERMO = "#e8690a";
const COOL   = "#22434f";
const HOT    = "#ffdd9e";

const VERTEX_SHADER = /* glsl */ `
  varying vec2  vUv;
  varying vec3  vPos;
  varying vec3  vNorm;
  uniform float uTime;
  uniform float uProb;
  uniform float uEntropy;

  void main() {
    vUv   = uv;
    vNorm = normal;
    vec3 pos = position;

    /* Entropy-driven turbulence: rougher when uncertain (p≈0.5) */
    float t = uTime;
    float wave = sin(pos.x * 5.0 + t * 1.4)
               * sin(pos.y * 5.0 - t * 1.2)
               * sin(pos.z * 5.0 + t * 0.8);
    pos += normal * wave * uEntropy * 0.18;

    /* Probability bias deforms the sphere into a slight prolate /
       oblate shape depending on how far p is from 0.5            */
    float bias = (uProb - 0.5) * 2.0;          // −1 … +1
    pos.z *= 1.0 + bias * 0.12;
    pos.xy *= 1.0 - abs(bias) * 0.06;

    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec2  vUv;
  varying vec3  vPos;
  varying vec3  vNorm;
  uniform float uTime;
  uniform float uProb;
  uniform float uEntropy;
  uniform vec3  uCool;
  uniform vec3  uMid;
  uniform vec3  uHot;

  void main() {
    /* Map the original normal z-coordinate to the bit-state axis:
       south pole (z = −1)  →  |0⟩   (p = 0)
       north pole (z = +1)  →  |1⟩   (p = 1)                       */
    float z = vNorm.z;
    float pMap = z * 0.5 + 0.5;

    /* Shift the colour gradient by the current probability */
    float mixFactor = smoothstep(0.0, 1.0, pMap + (uProb - 0.5) * 0.4);

    vec3 color = mix(uCool, uMid, smoothstep(0.0, 0.5, mixFactor));
    color      = mix(color, uHot, smoothstep(0.5, 1.0, mixFactor));

    /* Equator glow — brightest when entropy is maximal */
    float equator = 1.0 - abs(z);
    float glow = equator * uEntropy * 1.6;
    color += vec3(1.0, 0.85, 0.5) * glow;

    /* Subtle surface shimmer */
    float shimmer = sin(vPos.x * 10.0 + uTime * 2.0) * 0.015;
    color += shimmer;

    gl_FragColor = vec4(color, 1.0);
  }
`;


function TextSprite({ text, position, color = "#ffffff", size = 0.35 }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.font = "bold 80px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, color]);

  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} opacity={0.9} />
    </sprite>
  );
}

function Axes() {
  const geoms = useMemo(() => {
    const L = 1.9;
    return [
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0)
      ]), // x
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0)
      ]), // y
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L)
      ]), // z
    ];
  }, []);

  return (
    <group>
      <line geometry={geoms[0]}>
        <lineBasicMaterial color="#e74c3c" />
      </line>
      <line geometry={geoms[1]}>
        <lineBasicMaterial color="#2ecc71" />
      </line>
      <line geometry={geoms[2]}>
        <lineBasicMaterial color="#3498db" />
      </line>

      {/* Axis labels */}
      <TextSprite text="x" position={[2.05, 0, 0]} color="#e74c3c" size={0.22} />
      <TextSprite text="y" position={[0, 2.05, 0]} color="#2ecc71" size={0.22} />
      <TextSprite text="z" position={[0, 0, 2.05]} color="#3498db" size={0.22} />

      {/* Pole state markers */}
      <mesh position={[0, 0, -1.35]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={COOL} />
      </mesh>
      <TextSprite text="|0⟩  p≈0" position={[0.3, 0.15, -1.5]} color={COOL} size={0.32} />

      <mesh position={[0, 0, 1.35]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={HOT} />
      </mesh>
      <TextSprite text="|1⟩  p≈1" position={[0.3, 0.15, 1.5]} color={HOT} size={0.32} />
    </group>
  );
}


function EquatorRing() {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.08;
    const s = 1.0 + Math.sin(state.clock.elapsedTime * 0.4) * 0.015;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.32, 0.007, 16, 120]} />
      <meshBasicMaterial color={THERMO} transparent opacity={0.3} />
    </mesh>
  );
}


function ProbabilisticBit() {
  const meshRef = useRef();
  const wireRef = useRef();
  const matRef  = useRef();

  const uniforms = useMemo(
    () => ({
      uTime:    { value: 0 },
      uProb:    { value: 0.5 },
      uEntropy: { value: 0.693 },
      uCool:    { value: new THREE.Color(COOL) },
      uMid:     { value: new THREE.Color(THERMO) },
      uHot:     { value: new THREE.Color(HOT) },
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    /* Slowly oscillate probability so the viewer sees the bit
       evolve from ordered → uncertain → ordered               */
    const prob = 0.5 + 0.35 * Math.sin(t * 0.22);
    const p    = Math.max(0.001, Math.min(0.999, prob));
    const entropy = -(p * Math.log(p) + (1.0 - p) * Math.log(1.0 - p));

    if (matRef.current) {
      matRef.current.uniforms.uTime.value    = t;
      matRef.current.uniforms.uProb.value    = prob;
      matRef.current.uniforms.uEntropy.value = entropy;
    }
    if (meshRef.current) meshRef.current.rotation.y = t * 0.12;
    if (wireRef.current) wireRef.current.rotation.y = t * 0.12;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.3, 6]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>

      <mesh ref={wireRef} scale={1.015}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.06} />
      </mesh>

      <Axes />
      <EquatorRing />
    </group>
  );
}


function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas
      camera={{ position: [2.4, 1.6, 3.6], fov: 40 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={isDark ? 0.4 : 0.8} />
      <pointLight position={[3, 2, 3]} intensity={0.7} color={THERMO} />
      <pointLight position={[-3, -2, -3]} intensity={0.25} color={COOL} />
      <ProbabilisticBit />
    </Canvas>
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


export default function Scene4({ active }) {
  const { t } = useTranslation();
  return (
    <div className="scene-inner scene4-root">
      {/* whole-slide thermal background */}
      <div className="scene4-heat" aria-hidden="true">
        <div className="scene4-heat-flow" />
        <div className="scene4-heat-layer is-cold" />
        <div className="scene4-heat-layer is-base" />
        <div className="scene4-heat-layer is-mid" />
        <div className="scene4-heat-layer is-hot" />
        <div className="scene4-heat-layer is-peak" />
        <div className="scene4-entropy" />
      </div>
      <div className="scene4-heat-veil" aria-hidden="true" />

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
            <div className="instrument-frame">{active ? <Visual /> : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
}