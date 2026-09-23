import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMonitorStore } from "../../../store/monitorStore";
import { frame } from "../../../store/frameState";
import { PARADIGM_META } from "../../../config/paradigms";
import { useTheme } from "../../../context/ThemeContext";
import { colorsFor } from "../theme";
import { slabY, stageY } from "./layout";

const ROD = 0.1;
const TAP = 0.03;
const PULSE_S = 1.1;            // forward (up) then backward (down)
const base = new THREE.Color(PARADIGM_META.classical.color);
const tmp = new THREE.Color();

/**
 * The residual stream: a classical-paradigm rod at the right of the stack with a
 * tap into every block (two residual additions per block). A marker travels up on
 * each forward pass and back down for the backward pass.
 */
export default function ResidualStream({ layout, reduced, explodeRef }) {
  const rod = useRef(null);
  const marker = useRef(null);
  const taps = useRef(null);
  const lastExplode = useRef(-1);
  const tapObj = useMemo(() => new THREE.Object3D(), []);
  const { isDark } = useTheme();
  const colors = colorsFor(isDark);

  const geo = useMemo(() => {
    const from = layout.byId[layout.arch.stream.from];
    const to = layout.byId[layout.arch.stream.to];
    const y0 = from.yMid, y1 = to.yMid;
    const x = layout.streamX, z = -layout.depth / 2 + 0.3;
    const tapList = [];
    const push = (y, w, slab = null, stage = null) => tapList.push({ y, x0: w / 2, x1: x, slab, stage });
    push(y0, from.wMax, null, from); push(y1, to.wMax, null, to);
    for (const b of layout.blocks) {
      for (const s of b.sublayers) if (s.key === "attention" || s.key === "ffn") {
        const slab = layout.slabs.find((q) => q.id === s.id);
        push(slab.y, slab.w, slab);
      }
    }
    return { y0, y1, x, z, from, to, taps: tapList };
  }, [layout]);

  const writeTaps = (m, explode) => {
    geo.taps.forEach((t, i) => {
      tapObj.position.set((t.x0 + t.x1) / 2, t.slab ? slabY(t.slab, explode) : t.stage ? stageY(t.stage, explode) : t.y, geo.z);
      tapObj.scale.set(t.x1 - t.x0, TAP, TAP);
      tapObj.updateMatrix();
      m.setMatrixAt(i, tapObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useFrame((_, delta) => {
    const ui = useMonitorStore.getState().ui;
    const dim = ui.highlight && ui.highlight !== "classical" ? 0.2 : 1;
    const explode = explodeRef?.current ?? 0;
    if (explode !== lastExplode.current) {
      if (taps.current) writeTaps(taps.current, explode);
      if (rod.current) {
        const a = stageY(geo.from, explode), b = stageY(geo.to, explode);
        rod.current.position.y = (a + b) / 2;
        rod.current.scale.y = (b - a) / (geo.y1 - geo.y0);
      }
      lastExplode.current = explode;
    }
    const k = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 12);
    for (const m of [rod.current, taps.current]) {
      if (!m) continue;
      m.material.color.lerp(tmp.copy(base).multiplyScalar(0.7 * dim), k);
      m.material.emissive.lerp(tmp.copy(base).multiplyScalar(0.12 * dim), k);
    }
    const mk = marker.current;
    if (!mk) return;
    const phase = (frame.time - frame.stepAt) / PULSE_S;
    if (phase < 0 || phase > 1 || reduced) { mk.visible = false; return; }
    mk.visible = true;
    const up = phase < 0.5;
    const f = up ? phase * 2 : 1 - (phase - 0.5) * 2;
    const ya = stageY(geo.from, explode), yb = stageY(geo.to, explode);
    mk.position.y = ya + (yb - ya) * f;
    tmp.set(up ? colors.ink : colors.inkDim).multiplyScalar(dim);
    mk.material.color.copy(tmp);
  });

  const len = geo.y1 - geo.y0;
  return (
    <group>
      <mesh ref={rod} position={[geo.x, (geo.y0 + geo.y1) / 2, geo.z]}>
        <boxGeometry args={[ROD, len, ROD]} />
        <meshStandardMaterial color={base} roughness={0.8} metalness={0} />
      </mesh>
      <instancedMesh ref={taps} args={[undefined, undefined, geo.taps.length]} onUpdate={(m) => writeTaps(m, explodeRef?.current ?? 0)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={base} roughness={0.8} metalness={0} />
      </instancedMesh>
      <mesh ref={marker} position={[geo.x, geo.y0, geo.z]} visible={false}>
        <boxGeometry args={[ROD * 2.2, 0.08, ROD * 2.2]} />
        <meshBasicMaterial color={colors.ink} toneMapped={false} />
      </mesh>
    </group>
  );
}
