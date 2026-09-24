import { useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMonitorStore } from "../../store/monitorStore";
import { frame } from "../../store/frameState";
import { Environment, Lightformer } from "@react-three/drei";
import { useTheme } from "../../context/ThemeContext";
import { colorsFor, DPR, CAMERA_FOV, DEFAULT_VIEW, viewPosition } from "./theme";
import Floor from "./Floor";
import CameraRig from "./CameraRig";
import ArchitectureDiagram from "./diagram/ArchitectureDiagram";

/** Advances the shared scene clock. In reduced-motion mode frames are rendered on demand. */
function FrameDriver({ reduced }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!reduced) return undefined;
    return useMonitorStore.subscribe(() => invalidate());
  }, [reduced, invalidate]);
  useFrame((_, delta) => {
    if (!frame.paused && !reduced) frame.time += Math.min(delta, 0.1);
  });
  return null;
}

export default function Scene({ reduced }) {
  const setSelected = useMonitorStore((s) => s.setSelected);
  const { isDark } = useTheme();
  const colors = colorsFor(isDark);
  return (
    <Canvas
      dpr={DPR}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping, powerPreference: "high-performance" }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 300, position: viewPosition(DEFAULT_VIEW, frame.diagramHeight) }}
      frameloop={reduced ? "demand" : "always"}
      onPointerMissed={() => setSelected(null)}
    >
      <color attach="background" args={[colors.bg]} />
      <FrameDriver reduced={reduced} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#1a1f26", 0.45]} />
      <directionalLight position={[8, 16, 10]} intensity={1.15} />
      <directionalLight position={[-12, 6, -8]} intensity={0.35} />
      <directionalLight position={[6, -4, 12]} intensity={0.25} color="#8fb4ff" />
      {/* Local light environment (no network) so the metallic foil has something to reflect. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.5}>
        <color attach="background" args={["#0a0c10"]} />
        <Lightformer form="rect" intensity={1.6} color="#fff4e0" position={[0, 6, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 1.4, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#9fc2ff" position={[-6, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[2.5, 4, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#ffffff" position={[5, -1, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[2, 2, 1]} />
      </Environment>
      <Floor />
      <ArchitectureDiagram reduced={reduced} />
      <CameraRig reduced={reduced} />
    </Canvas>
  );
}
