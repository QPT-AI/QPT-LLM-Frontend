import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useMonitorStore } from "../../store/monitorStore";
import { frame } from "../../store/frameState";
import { CAMERA_TARGET, viewPosition } from "./theme";

const v = (a) => new THREE.Vector3(...a);

/** Free orbit at all times; the view presets ease the camera to a stored position. */
export default function CameraRig({ reduced }) {
  const controls = useRef(null);
  const camera = useThree((s) => s.camera);
  const view = useMonitorStore((s) => s.ui.view);
  const nonce = useMonitorStore((s) => s.ui.viewNonce);
  const exploded = useMonitorStore((s) => s.ui.exploded);
  const goal = useRef(null);

  // Refit whenever a preset is requested or the stack height changes (exploded view).
  useEffect(() => {
    goal.current = { pos: v(viewPosition(view, frame.diagramHeight)), target: v(CAMERA_TARGET) };
  }, [view, nonce, exploded]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const cancel = () => { goal.current = null; };
    c.addEventListener("start", cancel);
    return () => c.removeEventListener("start", cancel);
  }, []);

  useFrame((_, delta) => {
    const c = controls.current;
    const g = goal.current;
    if (!c) return;
    if (g) {
      const a = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.5) * 4);
      camera.position.lerp(g.pos, a);
      c.target.lerp(g.target, a);
      if (camera.position.distanceTo(g.pos) < 0.01) goal.current = null;
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={6}
      maxDistance={110}
      maxPolarAngle={Math.PI * 0.55}
    />
  );
}
