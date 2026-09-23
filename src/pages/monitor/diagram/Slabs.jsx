import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { useMonitorStore } from "../../../store/monitorStore";
import { frame } from "../../../store/frameState";
import { useTheme } from "../../../context/ThemeContext";
import { colorsFor } from "../theme";
import { makeSlabMaterial } from "./materials/paradigmShaders";
import { slabY } from "./layout";

const box = new THREE.BoxGeometry(1, 1, 1);
const DIM_OTHER_PARADIGM = 0.16;
const DIM_OTHER_LAYER = 0.3;
const ease = (t) => 1 - Math.pow(1 - t, 3);

const pick = (s) => ({ id: s.id, key: s.key, layer: s.layer ?? null, labelKey: s.labelKey, shapeKey: s.shapeKey, params: s.params, paradigm: s.paradigm, tied: !!s.tied });

/**
 * Every component of the model as a lit 3D rectangle with a procedural surface
 * for its paradigm and a luminous border. One useFrame drives the per-slab
 * uniforms (emphasis, energy, heat, time), the explode offset and the mount reveal.
 */
export default function Slabs({ layout, reduced, explodeRef }) {
  const meshes = useRef([]);
  const edges = useRef([]);
  const mountAt = useRef(null);
  const { isDark } = useTheme();
  const ink = colorsFor(isDark).ink;
  const INK = useMemo(() => new THREE.Color(ink), [ink]);

  const materials = useMemo(
    () => layout.slabs.map((s, i) => makeSlabMaterial(s.paradigm, { seed: i * 0.61803 + 0.17, size: [s.w, s.h, s.d], ink })),
    [layout, ink],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const handlers = useMemo(() => {
    const store = useMonitorStore;
    const payload = (e) => ({ ...pick(e.object.userData.slab), x: e.clientX, y: e.clientY });
    return {
      onPointerMove(e) {
        e.stopPropagation();
        const slab = e.object.userData.slab;
        const cur = store.getState().ui.hovered;
        if (!cur || cur.id !== slab.id) document.body.style.cursor = "pointer";
        store.getState().setHovered(cur && cur.id === slab.id ? { ...cur, x: e.clientX, y: e.clientY } : payload(e));
      },
      onPointerOut() { useMonitorStore.getState().setHovered(null); document.body.style.cursor = ""; },
      onClick(e) {
        e.stopPropagation();
        const p = payload(e);
        const cur = store.getState().ui.selected;
        store.getState().setSelected(cur && cur.id === p.id ? null : p);
      },
    };
  }, []);

  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 12);
    if (mountAt.current == null) mountAt.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - mountAt.current;
    const ui = useMonitorStore.getState().ui;
    const hotId = ui.hovered?.id ?? ui.selected?.id;
    const selLayer = ui.selected?.layer ?? null;
    const explode = explodeRef?.current ?? 0;

    for (let i = 0; i < layout.slabs.length; i++) {
      const slab = layout.slabs[i];
      const mesh = meshes.current[i];
      const edge = edges.current[i];
      const u = materials[i].userData.u;
      if (!mesh) continue;

      let dim = 1;
      if (ui.highlight && slab.paradigm !== ui.highlight) dim = DIM_OTHER_PARADIGM;
      if (selLayer != null && slab.layer !== selLayer) dim = Math.min(dim, DIM_OTHER_LAYER);
      const hot = hotId === slab.id ? 1 : 0;
      const energy = slab.layer != null ? frame.layerEnergy[slab.layer] : 0.5;

      u.uDim.value += (dim - u.uDim.value) * k;
      u.uHot.value += (hot - u.uHot.value) * k;
      u.uEnergy.value += (energy - u.uEnergy.value) * k * 0.5;
      u.uHeat.value = frame.temperature;
      u.uTime.value = frame.time;
      u.uMotion.value = reduced ? 0 : 1;

      if (edge) {
        const target = hot ? INK : u.uRim.value;
        edge.material.color.lerp(target, k);
        edge.material.opacity = 0.35 + 0.65 * Math.max(dim, 0.35);
      }

      const reveal = reduced ? 1 : ease(Math.min(1, Math.max(0, (t - i * 0.006) / 0.4)));
      mesh.scale.set(slab.w, Math.max(0.001, slab.h * reveal), slab.d);
      mesh.position.y = slabY(slab, explode) - (slab.h * (1 - reveal)) / 2;
    }
  });

  return (
    <group {...handlers}>
      {layout.slabs.map((slab, i) => (
        <mesh
          key={slab.id}
          ref={(m) => { meshes.current[i] = m; }}
          geometry={box}
          material={materials[i]}
          position={[0, slab.y, 0]}
          scale={[slab.w, slab.h, slab.d]}
          userData={{ slab }}
        >
          <Edges ref={(e) => { edges.current[i] = e; }} threshold={15} color={materials[i].userData.u.uRim.value} lineWidth={1.6} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}
