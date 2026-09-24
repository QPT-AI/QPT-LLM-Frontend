// Model geometry and the compute-paradigm assignment for every part of the LLM.
// Single source of truth shared by the landing-page pipeline (Scene5) and the
// Monitor's 3D architecture diagram. Colors come from PARADIGM_META.

export const MODEL = {
  blocks: 12,
  heads: 8,
  dModel: 768,
  dFf: 3072,
  seq: 1024,     // context length of the run
  seqVis: 16,    // token positions shown in the token stream / telemetry
  vocab: 50257,
};

/** Which paradigm executes each kind of component. */
export const COMPONENT_PARADIGM = {
  tokenizer: "classical",
  embedding: "quantum",
  positional: "photonic",
  attention: "photonic",
  ffn: "photonic",
  norm: "thermodynamic",
  residual: "classical",
  block: "classical",
  lm_head: "quantum",
  softmax: "thermodynamic",
  sampling: "thermodynamic",
  // diffusion-only components
  noise: "thermodynamic",
  timestep: "thermodynamic",
  denoise_step: "thermodynamic",
};

/** Landing-page pipeline (Scene5): the coarse component list in reading order. */
export const LLM_PIPELINE = [
  { id: 0, key: "tokenizer", label: "Tokenizer" },
  { id: 1, key: "embedding", label: "Token Embeddings" },
  { id: 2, key: "positional", label: "Positional Encoding" },
  { id: 3, key: "attention", label: "Attention Mechanism" },
  { id: 4, key: "ffn", label: "Feed-Forward Network" },
  { id: 5, key: "norm", label: "Normalization" },
  { id: 6, key: "residual", label: "Residual Connections" },
  { id: 7, key: "block", label: "Transformer Blocks" },
  { id: 8, key: "lm_head", label: "Output Projection" },
  { id: 9, key: "softmax", label: "Softmax / Distribution" },
  { id: 10, key: "sampling", label: "Sampling / Decoding" },
].map((l) => ({ ...l, paradigm: COMPONENT_PARADIGM[l.key] }));

// ── Slab footprint classes (relative widths of the 3D rectangles) ────────────
// Width encodes the tensor's feature dimension: token ids < d_model < d_ff < vocab.
export const WIDTH = { ids: 3.4, hidden: 4.6, ffn: 6.2, vocab: 7.4 };

const { blocks, heads, dModel: d, dFf, vocab: V, seq: T } = MODEL;
const attnParams = 4 * d * d + 4 * d;
const ffnParams = 2 * d * dFf + dFf + d;
const normParams = 2 * d;
const embedParams = V * d;

export const BLOCK_PARAMS = attnParams + ffnParams + 2 * normParams;
export const TOTAL_PARAMS = embedParams + blocks * BLOCK_PARAMS + normParams; // LM head tied

// Every piece of on-screen text below is an i18n key, not a literal string —
// resolve with t(key) / t(shapeKey, SHAPE_PARAMS) in the component that renders
// it (this module has no React/i18n dependency and is also imported by the
// landing page's Scene5 via LLM_PIPELINE, which is untouched).
export const SHAPE_PARAMS = { seq: T, dModel: d, dFf, vocab: V, heads, headDim: d / heads };

const stage = (id, key, labelKey, shapeKey, params, width, extra = {}) => ({
  id, key, labelKey, shapeKey, params, width, paradigm: COMPONENT_PARADIGM[key], ...extra,
});

function transformerBlock(i, { causal, adaptive }) {
  const attnLabelKey = causal ? "monitor.arch.sublayer.attnCausal" : "monitor.arch.sublayer.attnBidirectional";
  const normLabelKey = adaptive ? "monitor.arch.sublayer.normAdaptive" : "monitor.arch.sublayer.normPreNorm";
  const normParamsN = adaptive ? normParams + 2 * d * d / 8 : normParams;
  return {
    id: `block_${i}`,
    key: "block",
    layer: i,
    params: BLOCK_PARAMS,
    paradigm: COMPONENT_PARADIGM.block,
    sublayers: [
      stage(`block_${i}_norm1`, "norm", normLabelKey, "monitor.arch.sublayer.normShape", normParamsN, WIDTH.hidden, { layer: i }),
      stage(`block_${i}_attn`, "attention", attnLabelKey, "monitor.arch.sublayer.attnShape", attnParams, WIDTH.hidden, { layer: i }),
      stage(`block_${i}_norm2`, "norm", normLabelKey, "monitor.arch.sublayer.normShape", normParamsN, WIDTH.hidden, { layer: i }),
      stage(`block_${i}_ffn`, "ffn", "monitor.arch.sublayer.ffnLabel", "monitor.arch.sublayer.ffnShape", ffnParams, WIDTH.ffn, { layer: i }),
    ],
  };
}

const blockStages = (opts) => Array.from({ length: blocks }, (_, i) => transformerBlock(i, opts));

/** Autoregressive decoder: one token per forward pass, causal attention, sampled token fed back. */
const AUTOREGRESSIVE = {
  id: "ar",
  labelKey: "monitor.arch.ar.label",
  summaryKey: "monitor.arch.ar.summary",
  stages: [
    stage("tokenizer", "tokenizer", "monitor.arch.ar.tokenizer.label", "monitor.arch.ar.tokenizer.shape", 0, WIDTH.ids),
    stage("embedding", "embedding", "monitor.arch.ar.embedding.label", "monitor.arch.ar.embedding.shape", embedParams, WIDTH.vocab),
    stage("positional", "positional", "monitor.arch.ar.positional.label", "monitor.arch.ar.positional.shape", 0, WIDTH.hidden),
    ...blockStages({ causal: true, adaptive: false }),
    stage("final_norm", "norm", "monitor.arch.ar.finalNorm.label", "monitor.arch.ar.finalNorm.shape", normParams, WIDTH.hidden),
    stage("lm_head", "lm_head", "monitor.arch.ar.lmHead.label", "monitor.arch.ar.lmHead.shape", embedParams, WIDTH.vocab, { tied: true }),
    stage("softmax", "softmax", "monitor.arch.ar.softmax.label", "monitor.arch.ar.softmax.shape", 0, WIDTH.vocab),
    stage("sampling", "sampling", "monitor.arch.ar.sampling.label", "monitor.arch.ar.sampling.shape", 0, WIDTH.ids),
  ],
  loop: { from: "sampling", to: "tokenizer", labelKey: "monitor.arch.ar.loop.label", sublabelKey: "monitor.arch.ar.loop.sublabel" },
  stream: { from: "embedding", to: "final_norm" },
};

/** Discrete diffusion LM: the whole sequence is denoised in parallel over T timesteps. */
const DIFFUSION = {
  id: "diffusion",
  labelKey: "monitor.arch.diffusion.label",
  summaryKey: "monitor.arch.diffusion.summary",
  stages: [
    stage("tokenizer", "tokenizer", "monitor.arch.diffusion.tokenizer.label", "monitor.arch.diffusion.tokenizer.shape", 0, WIDTH.ids),
    stage("noise", "noise", "monitor.arch.diffusion.noise.label", "monitor.arch.diffusion.noise.shape", 0, WIDTH.ids),
    stage("embedding", "embedding", "monitor.arch.diffusion.embedding.label", "monitor.arch.diffusion.embedding.shape", embedParams, WIDTH.vocab),
    stage("positional", "positional", "monitor.arch.diffusion.positional.label", "monitor.arch.diffusion.positional.shape", 0, WIDTH.hidden),
    stage("timestep", "timestep", "monitor.arch.diffusion.timestep.label", "monitor.arch.diffusion.timestep.shape", 2 * d * d, WIDTH.hidden),
    ...blockStages({ causal: false, adaptive: true }),
    stage("final_norm", "norm", "monitor.arch.diffusion.finalNorm.label", "monitor.arch.diffusion.finalNorm.shape", normParams, WIDTH.hidden),
    stage("denoise_head", "lm_head", "monitor.arch.diffusion.denoiseHead.label", "monitor.arch.diffusion.denoiseHead.shape", embedParams, WIDTH.vocab, { tied: true }),
    stage("softmax", "softmax", "monitor.arch.diffusion.softmax.label", "monitor.arch.diffusion.softmax.shape", 0, WIDTH.vocab),
    stage("denoise_step", "denoise_step", "monitor.arch.diffusion.denoiseStep.label", "monitor.arch.diffusion.denoiseStep.shape", 0, WIDTH.ids),
  ],
  loop: { from: "denoise_step", to: "noise", labelKey: "monitor.arch.diffusion.loop.label", sublabelKey: "monitor.arch.diffusion.loop.sublabel" },
  stream: { from: "embedding", to: "final_norm" },
};

export const ARCHITECTURES = { ar: AUTOREGRESSIVE, diffusion: DIFFUSION };

/** Every 3D rectangle of an architecture (stages flattened with block sub-layers). */
export function listSlabs(arch) {
  const out = [];
  for (const s of arch.stages) {
    if (s.sublayers) out.push(...s.sublayers);
    else out.push(s);
  }
  return out;
}

/** Per-paradigm component count and parameter share for the legend. */
export function paradigmBreakdown(arch) {
  const acc = {};
  let total = 0;
  for (const slab of listSlabs(arch)) {
    const a = (acc[slab.paradigm] ??= { count: 0, params: 0 });
    a.count++;
    if (!slab.tied) { a.params += slab.params; total += slab.params; }
  }
  // the residual stream is a classical component too
  (acc.classical ??= { count: 0, params: 0 }).count++;
  for (const k in acc) acc[k].share = total ? acc[k].params / total : 0;
  return acc;
}

export function fmtParams(n) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
