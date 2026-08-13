import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Trail } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const PHOTONIC = "#f0ab00";

const X_START   = -2.6;
const X_END     =  2.6;
const AMPLITUDE = 0.55;
const OFF_SCREEN = new THREE.Vector3(0, -999, 0);
const PAUSE_DURATION = 1.0; // seconds to wait at the end before restarting

function buildSquareWavePoints(frequency) {
  const points = [];
  const totalWidth = X_END - X_START;
  const cycleWidth = totalWidth / frequency;
  const eps = 0.001;

  for (let c = 0; c < frequency; c++) {
    const x0 = X_START + c * cycleWidth;
    const x1 = x0 + cycleWidth / 2;
    const x2 = x0 + cycleWidth;

    points.push(new THREE.Vector3(x0,       -AMPLITUDE, 0));
    points.push(new THREE.Vector3(x0 + eps,  AMPLITUDE, 0));
    points.push(new THREE.Vector3(x1 - eps,  AMPLITUDE, 0));
    points.push(new THREE.Vector3(x1 + eps, -AMPLITUDE, 0));
    points.push(new THREE.Vector3(x2 - eps, -AMPLITUDE, 0));
  }
  points.push(new THREE.Vector3(X_END, -AMPLITUDE, 0));
  return points;
}

function squareWavePosition(t, frequency) {
  const totalWidth = X_END - X_START;
  const x = X_START + t * totalWidth;
  const cycleWidth = totalWidth / frequency;
  const posInCycle = ((x - X_START) % cycleWidth + cycleWidth) % cycleWidth;
  const y = posInCycle < cycleWidth / 2 ? AMPLITUDE : -AMPLITUDE;
  return new THREE.Vector3(x, y, 0);
}

function TravelingPulse({ frequency, speed }) {
  const tipRef = useRef();

  // All timing state lives in refs — no re-renders needed
  const cycleStartTime = useRef(null); // clock time when current run began
  const pauseStartTime = useRef(null); // clock time when pause began (null = not pausing)
  const cycleDuration  = useRef(1 / speed); // seconds for one full pass

  useFrame((state) => {
    const now = state.clock.elapsedTime;

    // First frame: initialise
    if (cycleStartTime.current === null) {
      cycleStartTime.current = now;
    }

    // --- PAUSING ---
    if (pauseStartTime.current !== null) {
      const pauseElapsed = now - pauseStartTime.current;
      if (pauseElapsed < PAUSE_DURATION) {
        // Still pausing — keep mesh off-screen so the trail stays flushed
        if (tipRef.current) tipRef.current.position.copy(OFF_SCREEN);
        return;
      }
      // Pause over — start a fresh cycle
      pauseStartTime.current = null;
      cycleStartTime.current = now;
    }

    // --- RUNNING ---
    const elapsed = now - cycleStartTime.current;
    const t = elapsed * speed; // 0 → 1 over one cycle

    if (t >= 1) {
      // Reached the end — park off-screen and begin pause
      if (tipRef.current) tipRef.current.position.copy(OFF_SCREEN);
      pauseStartTime.current = now;
      return;
    }

    const p = squareWavePosition(t, frequency);
    if (tipRef.current) tipRef.current.position.copy(p);
  });

  return (
    <Trail
      width={1.0}
      length={5}
      color={PHOTONIC}
      attenuation={(w) => w * w}
      target={tipRef}
    >
      <mesh ref={tipRef}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </Trail>
  );
}

function Visual({ frequency = 5, speed = 0.55 }) {
  const { isDark } = useTheme();
  const pathPoints = useMemo(() => buildSquareWavePoints(frequency), [frequency]);

  return (
    <Canvas
      camera={{ position: [0, 0.2, 4], fov: 40 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={isDark ? 0.3 : 0.7} />
      <pointLight position={[2, 2, 2]} intensity={0.6} color={PHOTONIC} />
      <Line
        points={pathPoints}
        color={PHOTONIC}
        transparent
        opacity={isDark ? 0.28 : 0.32}
        lineWidth={0.6}
      />
      <Suspense fallback={null}>
        <TravelingPulse frequency={frequency} speed={speed} />
      </Suspense>
    </Canvas>
  );
}

export default function Scene3({ active, frequency = 5, speed = 1.55 }) {
  const { t } = useTranslation();
  return (
    <div className="scene-inner">
      <div className="split">
        <div className="visual-pane">
          <div className="instrument-frame">
            {active ? <Visual frequency={frequency} speed={speed} /> : null}
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