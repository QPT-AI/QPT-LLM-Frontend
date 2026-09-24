import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useMonitorStore } from "../../../store/monitorStore";
import { frame } from "../../../store/frameState";
import { layoutArchitecture, layoutHeight } from "./layout";
import Slabs from "./Slabs";
import ResidualStream from "./ResidualStream";
import LoopPath from "./LoopPath";
import Labels from "./Labels";

/**
 * The model as a stack of paradigm-textured 3D rectangles. Remounts on
 * architecture change. Owns the animated explode factor (0 → 1) that spreads
 * each block's sub-layers apart, and publishes the target stack height for the camera fit.
 */
export default function ArchitectureDiagram({ reduced }) {
  const architecture = useMonitorStore((s) => s.ui.architecture);
  const exploded = useMonitorStore((s) => s.ui.exploded);
  const layout = useMemo(() => layoutArchitecture(architecture), [architecture]);
  const explodeRef = useRef(0);

  useEffect(() => {
    frame.diagramHeight = layoutHeight(layout, exploded ? 1 : 0);
  }, [layout, exploded]);

  useFrame((_, delta) => {
    const target = useMonitorStore.getState().ui.exploded ? 1 : 0;
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 6);
    explodeRef.current += (target - explodeRef.current) * k;
    if (Math.abs(explodeRef.current - target) < 0.002) explodeRef.current = target;
  });

  return (
    <group key={architecture}>
      <Slabs layout={layout} reduced={reduced} explodeRef={explodeRef} />
      <ResidualStream layout={layout} reduced={reduced} explodeRef={explodeRef} />
      <LoopPath layout={layout} reduced={reduced} />
      <Labels layout={layout} />
    </group>
  );
}
