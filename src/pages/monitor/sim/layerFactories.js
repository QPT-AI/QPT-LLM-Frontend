// Builders for the five per-layer backend records.
import { BLOCK_KEYS, N_BLOCKS, N_HEADS, SEQ_VIS } from "../telemetry/schema";
import { TOKENS_PER_STEP, TOTAL_STEPS, LR_MAX } from "./curves";
import { base } from "./recordFactories";

const LN_SEQ = Math.log(SEQ_VIS);
const REDUNDANT_BLOCK = 5; // ablating this one barely moves the loss

// Stable per-(layer, head) "role": 0 = local/syntactic … 1 = global/semantic.
const headRole = (l, h) => ((l * 7 + h * 13) % 11) / 10;

const perLayer = (fn) => Object.fromEntries(BLOCK_KEYS.map((k, i) => [k, fn(i)]));

export function makeLayerEnergy(ctx, m) {
  const stepTimeMs = 1000 / m.stepsPerS;
  const stepEnergy = m.cur.jPerTok * TOKENS_PER_STEP;
  const raw = Array.from({ length: N_BLOCKS }, (_, i) => 1 + 0.15 * Math.sin(i * 0.9) + m.rng.gauss() * 0.05);
  const sum = raw.reduce((a, b) => a + b, 0);
  return {
    ...base("layer_energy_cost", ctx),
    per_layer: perLayer((i) => {
      const pct = (raw[i] / sum) * 44.8;
      const energy_j = (pct / 100) * stepEnergy;
      return { time_ms: (pct / 100) * stepTimeMs, pct_of_step: pct, energy_j, cost_usd: (energy_j / 3600) * m.cur.costPerWh };
    }),
  };
}

export function makeGradientContribution(ctx, m) {
  const progress = Math.min(1, ctx.step / TOTAL_STEPS);
  const raw = Array.from({ length: N_BLOCKS }, (_, i) => Math.exp(0.12 * i * (1 - progress)) * (1 + m.rng.gauss() * 0.06));
  const sum = raw.reduce((a, b) => a + b, 0);
  return { ...base("gradient_contribution", ctx), per_layer: perLayer((i) => raw[i] / sum) };
}

export function makeParamUpdateRatio(ctx, m) {
  return {
    ...base("param_update_ratio", ctx),
    per_layer: perLayer((i) => {
      const param_norm = (m.paramNorm / N_BLOCKS) * (1 + 0.05 * Math.sin(i));
      const ratio = (m.lr / LR_MAX) * 1e-3 * (1 + 0.3 * Math.sin(i * 0.7)) * (1 + m.rng.gauss() * 0.08);
      return { param_norm, update_norm: param_norm * ratio, ratio };
    }),
  };
}

export function makeAttentionStats(ctx, m) {
  const progress = Math.min(1, ctx.step / TOTAL_STEPS);
  return {
    ...base("attention_stats", ctx),
    per_layer: perLayer((l) => Array.from({ length: N_HEADS }, (_, h) => {
      const role = headRole(l, h);
      const entropy = Math.max(0.15, LN_SEQ * (0.95 - 0.45 * progress) * (0.55 + 0.45 * role) * (1 + m.rng.gauss() * 0.05));
      return {
        head: h,
        entropy,
        effective_tokens: Math.exp(entropy),
        avg_distance: 1 + (SEQ_VIS / 2 - 1) * role * (1 + m.rng.gauss() * 0.1),
        redundancy: Math.min(1, Math.max(0, 0.2 + 0.5 * (1 - role) * progress + m.rng.gauss() * 0.05)),
        output_norm: 0.6 + 2.2 * (1 - role) * (0.5 + 0.5 * progress) + Math.abs(m.rng.gauss()) * 0.1,
      };
    })),
  };
}

export function makeBlockAblation(ctx, m) {
  const ppl = (l) => Math.exp(Math.min(l, 12));
  return {
    ...base("block_ablation", ctx),
    baseline_loss: m.loss,
    baseline_ppl: ppl(m.loss),
    n_batches: 8,
    per_layer: perLayer((i) => {
      const importance = i === REDUNDANT_BLOCK ? 0.01 : 0.35 + 0.65 * Math.sin((Math.PI * (i + 2)) / (N_BLOCKS + 3));
      const delta_loss = Math.max(0.005, (0.02 + 0.9 * importance) * (1 + m.rng.gauss() * 0.08));
      const ablated_loss = m.loss + delta_loss;
      return { ablated_loss, ablated_ppl: ppl(ablated_loss), delta_loss, delta_ppl: ppl(ablated_loss) - ppl(m.loss) };
    }),
  };
}
