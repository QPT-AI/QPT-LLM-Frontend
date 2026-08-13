import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const QUANTUM = "#5bad1e";

function alignRod(mesh, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(dir.length(), 0.0001);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(mid);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}

function EntangledPair() {
  const groupRef = useRef();
  const aRef = useRef();
  const bRef = useRef();
  const rodRef = useRef();
  const glowRef = useRef();
  const posA = useMemo(() => new THREE.Vector3(), []);
  const posB = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.14;

    const radius = 1.5;
    const angle = t * 0.85;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.42;
    const z = Math.sin(angle * 0.6) * 0.6;
    posA.set(x, y, z);
    posB.set(-x, -y, -z);

    if (aRef.current) {
      aRef.current.position.copy(posA);
      aRef.current.rotation.x += delta * 2.6;
      aRef.current.rotation.y += delta * 1.1;
    }
    if (bRef.current) {
      bRef.current.position.copy(posB);
      bRef.current.rotation.z += delta * 1.9;
      bRef.current.rotation.y -= delta * 2.1;
    }

    const pulse = 0.55 + Math.sin(t * 2.6) * 0.45;
    if (rodRef.current) {
      alignRod(rodRef.current, posA, posB);
      rodRef.current.material.emissiveIntensity = 0.8 + pulse * 1.4;
    }
    if (glowRef.current) {
      alignRod(glowRef.current, posA, posB);
      glowRef.current.material.opacity = 0.08 + pulse * 0.16;
    }
    if (aRef.current) aRef.current.material.emissiveIntensity = 1 + pulse;
    if (bRef.current) bRef.current.material.emissiveIntensity = 1 + pulse;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={glowRef}>
        <cylinderGeometry args={[0.09, 0.09, 1, 10, 1, true]} />
        <meshBasicMaterial color={QUANTUM} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={rodRef}>
        <cylinderGeometry args={[0.022, 0.022, 1, 10]} />
        <meshStandardMaterial color={QUANTUM} emissive={QUANTUM} emissiveIntensity={1.4} roughness={0.3} />
      </mesh>
      <mesh ref={aRef}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color={QUANTUM} emissive={QUANTUM} emissiveIntensity={1.4} roughness={0.2} metalness={0.25} />
      </mesh>
      <mesh ref={bRef}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color={QUANTUM} emissive={QUANTUM} emissiveIntensity={1.4} roughness={0.2} metalness={0.25} />
      </mesh>
    </group>
  );
}

function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.32 : 0.75} />
      <pointLight position={[3, 3, 3]} intensity={1.4} color={QUANTUM} />
      <pointLight position={[-3, -2, -2]} intensity={0.4} color={QUANTUM} />
      <Suspense fallback={null}>
        <EntangledPair />
      </Suspense>
    </Canvas>
  );
}

export default function Scene2({ active }) {
  const { t } = useTranslation();
  return (
    <div className="scene-inner">
      <div className="split">
        <div className="scene-text">
          <span className="eyebrow stroke-hair">
            <span className="eyebrow-dot" style={{ background: QUANTUM }} />
            {t("scene2.eyebrow")}
          </span>
          <div className="letter-block" style={{ margin: "10px 0 20px" }}>
            <span className="letter-giant stroke-lg" style={{ color: QUANTUM }}>
              Q
            </span>
            <span className="letter-suffix stroke-sm">uantum</span>
          </div>
          <br/>
          <p className="body-line" style={{ maxWidth: "38ch" }}>
            {t("scene2.description")}
          </p>
        </div>
        <div className="visual-pane">
          <div className="instrument-frame">{active ? <Visual /> : null}</div>
        </div>
      </div>
    </div>
  );
}
