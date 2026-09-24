// Pure geometry for the architecture diagram: a vertical stack of 3D rectangles,
// bottom = input, top = output, centred on the origin. World units, y up.
import { ARCHITECTURES } from "../../../config/architecture";

export const DIMS = {
  depth: 2.0,      // z extent of every slab (the sequence axis)
  subH: 0.18,      // height of a block sub-layer slab
  subGap: 0.07,
  stageH: 0.3,     // height of a standalone stage slab
  stageGap: 0.46,
  blockGap: 0.3,
};

/** Extra spacing inserted between a block's sub-layers in the exploded view (per gap, world units). */
export const EXPLODE_GAP = 0.22;

/** Vertical centre of a slab for an explode factor in [0, 1]. */
export function slabY(slab, explode = 0) {
  return slab.y + slab.explodeCoef * EXPLODE_GAP * explode;
}

/** Vertical centre of a stage (block or standalone) for an explode factor. */
export function stageY(stage, explode = 0) {
  return stage.yMid + stage.explodeCoef * EXPLODE_GAP * explode;
}

/** Stage extent [y0, y1] for an explode factor (blocks grow, standalone stages only shift). */
export function stageExtent(stage, explode = 0) {
  const shift = stage.explodeCoef * EXPLODE_GAP * explode;
  const grow = stage.sublayers ? 1.5 * EXPLODE_GAP * explode : 0;
  return { y0: stage.y0 + shift - grow, y1: stage.y1 + shift + grow };
}

/** Total stack height for an explode factor (used to fit the camera). */
export function layoutHeight(layout, explode = 0) {
  return layout.height + layout.blocks.length * 3 * EXPLODE_GAP * explode;
}

export function layoutArchitecture(id) {
  const arch = ARCHITECTURES[id];
  const { depth, subH, subGap, stageH, stageGap, blockGap } = DIMS;
  const slabs = [];
  const stages = [];
  let y = 0;
  let trailing = 0;

  for (const st of arch.stages) {
    if (st.sublayers) {
      const y0 = y;
      st.sublayers.forEach((sub, k) => {
        slabs.push({ ...sub, stageId: st.id, index: slabs.length, subIndex: k, y: y + subH / 2, h: subH, w: sub.width, d: depth });
        y += subH + (k < st.sublayers.length - 1 ? subGap : 0);
      });
      stages.push({ ...st, y0, y1: y, yMid: (y0 + y) / 2, wMax: Math.max(...st.sublayers.map((s) => s.width)) });
      y += blockGap; trailing = blockGap;
    } else {
      slabs.push({ ...st, stageId: st.id, index: slabs.length, y: y + stageH / 2, h: stageH, w: st.width, d: depth });
      stages.push({ ...st, y0: y, y1: y + stageH, yMid: y + stageH / 2, wMax: st.width });
      y += stageH + stageGap; trailing = stageGap;
    }
  }

  const height = y - trailing;
  const off = height / 2;
  for (const s of slabs) s.y -= off;
  for (const s of stages) { s.y0 -= off; s.y1 -= off; s.yMid -= off; }

  const blocks = stages.filter((s) => s.sublayers);

  // Exploded view: blocks spread symmetrically about the centre (3 gaps each),
  // sub-layers spread inside their block, standalone stages shift outward so
  // nothing collides. Coefficients are in units of EXPLODE_GAP.
  const n = blocks.length;
  const blockY0 = blocks[0].y0;
  stages.forEach((st) => {
    if (st.sublayers) st.explodeCoef = (blocks.indexOf(st) - (n - 1) / 2) * 3;
    else st.explodeCoef = st.y0 < blockY0 ? -1.5 * n : 1.5 * n;
  });
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));
  slabs.forEach((sl) => {
    const st = stageById[sl.stageId];
    sl.explodeCoef = st.explodeCoef + (sl.subIndex != null ? sl.subIndex - 1.5 : 0);
  });

  const byId = stageById;
  const wMax = Math.max(...slabs.map((s) => s.w));
  return {
    arch, slabs, stages, blocks, byId, height, wMax, depth,
    blockRegion: { y0: blocks[0].y0, y1: blocks[blocks.length - 1].y1, wMax: blocks[0].wMax },
    streamX: wMax / 2 + 0.7,   // residual stream rod (right, rear)
    loopX: wMax / 2 + 1.9,     // feedback loop path (right, front)
    bracketX: -wMax / 2 - 0.7, // block group bracket (left)
  };
}
