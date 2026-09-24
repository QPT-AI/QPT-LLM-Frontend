// Builders for the scalar backend records (train / val / profile) and the
// three frontend-only synthetic records (tokens / log / substrate).
// Shapes match telemetry/schema.js exactly.
import { COMPONENT_KEYS } from "../telemetry/schema";
import { TOKENS_PER_STEP } from "./curves";
import { heatOf } from "./paradigmProfiles";

export function base(type, ctx) {
  return {
    record_type: type,
    model_type: ctx.architecture === "ar" ? "autoregressive" : "diffusion",
    step: ctx.step,
    epoch: ctx.epoch,
    split: type,
  };
}

const r4 = (v) => Math.round(v * 1e4) / 1e4;

export function makeTrain(ctx, m) {
  const stepEnergy = m.cur.jPerTok * TOKENS_PER_STEP;
  return {
    ...base("train", ctx),
    tokens_processed: ctx.step * TOKENS_PER_STEP,
    loss: m.loss,
    perplexity: Math.exp(Math.min(m.loss, 12)),
    learning_rate: m.lr,
    gradient_norm: m.gradNorm,
    parameter_norm: m.paramNorm,
    val_loss: m.val?.loss ?? null,
    val_ppl: m.val?.ppl ?? null,
    val_step: m.val?.step ?? null,
    vram_gb: r4(m.cur.vramGb * (1 + m.rng.gauss() * 0.005)),
    elapsed_s: m.elapsed,
    steps_per_s: m.stepsPerS,
    hardware_energy_joules_per_token: m.cur.jPerTok,
    step_energy_j: stepEnergy,
    step_cost_usd: (stepEnergy / 3600) * m.cur.costPerWh,
    cumulative_energy_j: m.cumEnergy,
    cumulative_cost_usd: m.cumCost,
    cost_per_wh: m.cur.costPerWh,
  };
}

export function makeVal(ctx, val, final = false) {
  return { ...base("val", ctx), val_loss: val.loss, val_ppl: val.ppl, final };
}

// pct-of-step weights; block_total aggregates its four sub-components.
const COMPONENT_PCT = {
  dataset: 2.1, attention_masks: 0.4, input_embeddings: 1.2, positional_embeddings: 0.3,
  layer_norm: 2.8, matrix_multiplication: 31.0, multi_head_self_attention: 18.5,
  residual_connections: 1.1, feed_forward_mlp: 22.4, transformer_block_total: 44.8,
  output_lm_head: 6.2, loss_function: 1.4, softmax_probability_distribution: 2.2,
  backpropagation: 38.0, gradient_updates: 4.1, optimizer: 5.3, parameters_weights: 0.9,
  biases: 0.1, parameter_update_ratio: 0.6,
};
const CALLS_PER_STEP = {
  dataset: 1, attention_masks: 1, input_embeddings: 1, positional_embeddings: 1, layer_norm: 25,
  matrix_multiplication: 148, multi_head_self_attention: 12, residual_connections: 24,
  feed_forward_mlp: 12, transformer_block_total: 12, output_lm_head: 1, loss_function: 1,
  softmax_probability_distribution: 13, backpropagation: 1, gradient_updates: 1, optimizer: 1,
  parameters_weights: 1, biases: 1, parameter_update_ratio: 1,
};

export function makeProfile(ctx, m) {
  const every = 500;
  const stepTime = 1 / m.stepsPerS;
  const totalTime = stepTime * every;
  const stepEnergy = m.cur.jPerTok * TOKENS_PER_STEP;
  const energy = stepEnergy * every;
  const components = {};
  for (const key of COMPONENT_KEYS) {
    const pct = COMPONENT_PCT[key] * (1 + m.rng.gauss() * 0.04);
    const calls = CALLS_PER_STEP[key] * every;
    const time_s = (pct / 100) * totalTime;
    const energy_j = (pct / 100) * energy;
    components[key] = {
      time_s, calls, avg_time_ms: (time_s / calls) * 1000, pct_of_step: pct,
      energy_j, cost_usd: (energy_j / 3600) * m.cur.costPerWh,
    };
  }
  return {
    ...base("profile", ctx),
    profile_every: every,
    total_time_s: totalTime,
    vram_gb: m.cur.vramGb,
    avg_power_w: m.cur.powerW * (1 + m.rng.gauss() * 0.02),
    energy_j: energy,
    hardware_energy_joules_per_token: m.cur.jPerTok,
    step_cost_usd: (stepEnergy / 3600) * m.cur.costPerWh,
    cumulative_energy_j: m.cumEnergy,
    cumulative_cost_usd: m.cumCost,
    cost_per_wh: m.cur.costPerWh,
    components,
  };
}

// ── synthetic (NOT FROM BACKEND) ─────────────────────────────────────────────
export function makeTokens(ctx, gen) {
  return { ...base("tokens", ctx), ...gen };
}

export function makeLog(ctx, level, msg) {
  return { ...base("log", ctx), level, msg };
}

export function makeSubstrate(ctx, cur, energyGauge, rng) {
  return {
    ...base("substrate", ctx),
    paradigm: cur.paradigm,
    utilization: cur.utilization * (1 + rng.gauss() * 0.01),
    latency_ms: cur.latencyMs * (1 + rng.gauss() * 0.04),
    error_rate: cur.errorRate * (1 + rng.gauss() * 0.1),
    thermal: { value: cur.thermal, unit: cur.thermalUnit },
    heat: heatOf(cur),
    energy_gauge: energyGauge,
    power_w: cur.powerW * (1 + rng.gauss() * 0.02),
    tokens_per_s: cur.tokPerS,
  };
}
