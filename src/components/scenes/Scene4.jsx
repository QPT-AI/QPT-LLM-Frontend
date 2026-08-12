import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const THERMO = "#e8690a";

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float disp = sin(pos.x * 3.0 + uTime * 1.3)
               * sin(pos.y * 3.0 - uTime * 1.1)
               * sin(pos.z * 3.0 + uTime * 0.7);
    pos += normal * disp * 0.05;
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3 uCool;
  uniform vec3 uMid;
  uniform vec3 uHot;

  void main() {
    float n = sin(vPos.x * 2.2 + uTime * 0.9) * 0.5
            + sin(vPos.y * 2.6 - uTime * 1.15) * 0.5
            + sin((vPos.x + vPos.z) * 1.7 + uTime * 0.6) * 0.4;
    n = clamp(n * 0.5 + 0.5, 0.0, 1.0);

    vec3 color = mix(uCool, uMid, smoothstep(0.0, 0.55, n));
    color = mix(color, uHot, smoothstep(0.55, 1.0, n));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function HeatMap() {
  const meshRef = useRef();
  const wireRef = useRef();
  const matRef = useRef();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCool: { value: new THREE.Color("#22434f") },
      uMid: { value: new THREE.Color(THERMO) },
      uHot: { value: new THREE.Color("#ffdd9e") },
    }),
    []
  );

  useFrame((state, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.22;
    if (wireRef.current) wireRef.current.rotation.y += delta * 0.22;
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.3, 5]} />
        <shaderMaterial ref={matRef} vertexShader={VERTEX_SHADER} fragmentShader={FRAGMENT_SHADER} uniforms={uniforms} />
      </mesh>
      <mesh ref={wireRef} scale={1.012}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.5 : 0.9} />
      <pointLight position={[3, 2, 3]} intensity={0.6} color={THERMO} />
      <HeatMap />
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
          <div className="letter-block" style={{ margin: "10px 0 20px" }}>
            <span className="letter-giant stroke-lg" style={{ color: THERMO }}>
              T
            </span>
            <span className="letter-suffix stroke-sm">hermodynamic</span>
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
