import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Trail } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const PHOTONIC = "#f0ab00";

function useWaveCurve() {
  return useMemo(() => {
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const x = -2.6 + (i / 60) * 5.2;
      const y = Math.sin(x * 2.3) * 0.62;
      const z = Math.cos(x * 1.1) * 0.28;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);
}

function TravelingPulse({ curve }) {
  const tipRef = useRef();
  const lightRef = useRef();

  useFrame((state) => {
    const t = (state.clock.elapsedTime * 0.16) % 1;
    const p = curve.getPointAt(t);
    if (tipRef.current) tipRef.current.position.copy(p);
    if (lightRef.current) lightRef.current.position.copy(p);
  });

  return (
    <Trail width={2.4} length={7} color={PHOTONIC} attenuation={(w) => w * w} target={tipRef}>
      <mesh ref={tipRef}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </Trail>
  );
}

function Visual() {
  const { isDark } = useTheme();
  const curve = useWaveCurve();
  const pathPoints = useMemo(() => curve.getPoints(120), [curve]);

  return (
    <Canvas camera={{ position: [0, 0.2, 4], fov: 40 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.3 : 0.7} />
      <pointLight position={[2, 2, 2]} intensity={0.6} color={PHOTONIC} />
      <Line points={pathPoints} color={PHOTONIC} transparent opacity={isDark ? 0.28 : 0.32} lineWidth={1} />
      <Suspense fallback={null}>
        <TravelingPulse curve={curve} />
      </Suspense>
    </Canvas>
  );
}

export default function Scene3({ active }) {
  const { t } = useTranslation();
  return (
    <div className="scene-inner">
      <div className="split">
        <div className="visual-pane">
          <div className="instrument-frame">{active ? <Visual /> : null}</div>
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
          <p className="body-line" style={{ maxWidth: "38ch" }}>
            {t("scene3.description")}
          </p>
        </div>
      </div>
    </div>
  );
}
