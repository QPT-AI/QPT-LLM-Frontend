import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { PARADIGM_META } from "../../../config/paradigms";
import { stageY } from "./layout";

/**
 * The feedback path that makes both architectures iterative: the sampled token
 * re-entering the context (autoregressive) or xₜ₋₁ re-entering the denoiser
 * (diffusion). Dashed, animated in the flow direction, labelled at its midpoint.
 */
export default function LoopPath({ layout, reduced }) {
  const { t } = useTranslation();
  const line = useRef(null);
  const { loop } = layout.arch;
  const color = PARADIGM_META[layout.byId[loop.from].paradigm].color;
  const isDiffusion = layout.arch.id === "diffusion";
  const timestep = useMonitorStore((s) => (isDiffusion ? s.ui.diffusionScrub ?? s.latest.tokens?.timestep ?? null : null));
  const highlight = useMonitorStore((s) => s.ui.highlight);
  const explode = useMonitorStore((s) => (s.ui.exploded ? 1 : 0));
  const dim = highlight && highlight !== layout.byId[loop.from].paradigm;

  const geo = useMemo(() => {
    const from = layout.byId[loop.from];
    const to = layout.byId[loop.to];
    const yFrom = stageY(from, explode);
    const yTo = stageY(to, explode);
    const x = layout.loopX;
    const points = [
      [from.wMax / 2, yFrom, 0],
      [x, yFrom, 0],
      [x, yTo, 0],
      [to.wMax / 2 + 0.2, yTo, 0],
    ];
    // label hangs under the bottom run, right-aligned to the vertical segment, so it stays inside the stack's footprint
    return { points, x, labelPos: [x, yTo - 0.35, 0], arrow: [to.wMax / 2 + 0.12, yTo, 0] };
  }, [layout, loop, explode]);

  useFrame((_, delta) => {
    const m = line.current?.material;
    if (!m) return;
    if (!reduced) m.dashOffset -= Math.min(delta, 0.1) * 0.9;
    m.opacity = dim ? 0.2 : 0.9;
  });

  return (
    <group>
      <Line ref={line} points={geo.points} color={color} lineWidth={1.5} dashed dashSize={0.18} gapSize={0.12} transparent opacity={0.9} />
      <mesh position={geo.arrow} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.26, 12]} />
        <meshBasicMaterial color={color} transparent opacity={dim ? 0.2 : 1} />
      </mesh>
      <Html position={geo.labelPos} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className={`mon-lbl mon-lbl--loop ${dim ? "is-dim" : ""}`}>
          <div className="mon-lbl__title">{t(loop.labelKey)}</div>
          <div className="mon-lbl__sub">{t(loop.sublabelKey)}</div>
          {isDiffusion && timestep != null && <div className="mon-lbl__live">t = {Math.round(timestep)} / 1000</div>}
        </div>
      </Html>
    </group>
  );
}
