/**
 * Telemetry contract for the Monitor.
 *
 * Everything under "BACKEND RECORDS" mirrors the training backend's JSONL
 * output 1:1. The simulator (sim/TrainingSimulator.js) fabricates records in
 * exactly this shape; the WebSocket adapter (telemetry/socketAdapter.js)
 * forwards them untouched. The render layer only ever sees these records.
 */

import { MODEL } from "../../../config/architecture";

// ── Model geometry (matches the backend run) ─────────────────────────────────
export const N_BLOCKS = MODEL.blocks;
export const N_HEADS = MODEL.heads;
export const SEQ_VIS = MODEL.seqVis; // token positions visualised in the token stream

export const BLOCK_KEYS = Array.from({ length: N_BLOCKS }, (_, i) => `transformer_block_${i}`);

// ── BACKEND RECORDS ──────────────────────────────────────────────────────────
export const RECORD_TYPES = [
  "train",                 // every 10 steps
  "val",                   // validation checkpoint
  "profile",               // per-component timing/energy/cost (every 500 steps)
  "layer_energy_cost",     // per-layer energy breakdown
  "gradient_contribution", // per-layer gradient share (plain number per block)
  "param_update_ratio",    // per-layer update magnitude
  "attention_stats",       // per-head attention metrics (array of 8 per block)
  "block_ablation",        // layer importance via ablation
];

export const COMPONENT_KEYS = [
  "dataset", "attention_masks", "input_embeddings", "positional_embeddings",
  "layer_norm", "matrix_multiplication", "multi_head_self_attention",
  "residual_connections", "feed_forward_mlp", "transformer_block_total",
  "output_lm_head", "loss_function", "softmax_probability_distribution",
  "backpropagation", "gradient_updates", "optimizer", "parameters_weights",
  "biases", "parameter_update_ratio",
];

/**
 * @typedef {Object} RecordBase
 * @property {string} record_type   discriminator, one of RECORD_TYPES (or SYNTHETIC_TYPES)
 * @property {"autoregressive"|"diffusion"} model_type
 * @property {number} step          global training step
 * @property {number} epoch
 * @property {string} split         mirrors record_type
 *
 * @typedef {RecordBase & {
 *   tokens_processed:number, loss:number, perplexity:number, learning_rate:number,
 *   gradient_norm:number, parameter_norm:number,
 *   val_loss:number|null, val_ppl:number|null, val_step:number|null,
 *   vram_gb:number, elapsed_s:number, steps_per_s:number,
 *   hardware_energy_joules_per_token:number|null, step_energy_j:number|null,
 *   step_cost_usd:number|null, cumulative_energy_j:number, cumulative_cost_usd:number,
 *   cost_per_wh:number }} TrainRecord
 *
 * @typedef {RecordBase & { val_loss:number, val_ppl:number, final:boolean }} ValRecord
 *
 * @typedef {{ time_s:number, calls:number, avg_time_ms:number, pct_of_step:number,
 *   energy_j:number, cost_usd:number }} ComponentProfile
 * @typedef {RecordBase & { profile_every:number, total_time_s:number, vram_gb:number,
 *   avg_power_w:number, energy_j:number, hardware_energy_joules_per_token:number,
 *   step_cost_usd:number, cumulative_energy_j:number, cumulative_cost_usd:number,
 *   cost_per_wh:number, components:Record<string, ComponentProfile> }} ProfileRecord
 *
 * @typedef {RecordBase & { per_layer:Record<string,{time_ms:number,pct_of_step:number,
 *   energy_j:number,cost_usd:number}> }} LayerEnergyRecord
 * @typedef {RecordBase & { per_layer:Record<string, number> }} GradientContributionRecord
 * @typedef {RecordBase & { per_layer:Record<string,{param_norm:number,update_norm:number,
 *   ratio:number}> }} ParamUpdateRatioRecord
 * @typedef {{ head:number, entropy:number, effective_tokens:number, avg_distance:number,
 *   redundancy:number, output_norm:number }} HeadStats
 * @typedef {RecordBase & { per_layer:Record<string, HeadStats[]> }} AttentionStatsRecord
 * @typedef {RecordBase & { baseline_loss:number, baseline_ppl:number, n_batches:number,
 *   per_layer:Record<string,{ablated_loss:number,ablated_ppl:number,delta_loss:number,
 *   delta_ppl:number}> }} BlockAblationRecord
 */

// ── SYNTHETIC RECORDS — NOT FROM BACKEND ─────────────────────────────────────
// The backend schema has no token stream, log line, or substrate readout. These
// three are produced client-side (by the simulator, or by a future adapter that
// derives them). A live backend may omit them and the HUD degrades gracefully.
export const SYNTHETIC_TYPES = ["tokens", "log", "substrate"];

/**
 * @typedef {RecordBase & { mode:"ar"|"diffusion", tokens:string[], confidences:number[],
 *   timestep:number|null, new_token:string|null }} TokensRecord
 * @typedef {RecordBase & { level:"info"|"warn"|"error", msg:string }} LogRecord
 * @typedef {RecordBase & { paradigm:string, utilization:number, latency_ms:number,
 *   error_rate:number, thermal:{value:number,unit:string}, heat:number,
 *   energy_gauge:number, power_w:number, tokens_per_s:number }} SubstrateRecord
 */

const ALL_TYPES = new Set([...RECORD_TYPES, ...SYNTHETIC_TYPES]);

export function isTelemetryRecord(x) {
  return !!x && typeof x === "object" && ALL_TYPES.has(x.record_type) && Number.isFinite(x.step);
}

/**
 * Every telemetry source (simulator, WebSocket, …) implements this interface.
 * Swapping sources is a one-line change in telemetry/createTelemetrySource.js.
 *
 * @typedef {Object} TelemetrySource
 * @property {"sim"|"socket"} kind
 * @property {(cb:(record:object)=>void)=>()=>void} subscribe   returns unsubscribe
 * @property {()=>void} start
 * @property {()=>void} pause
 * @property {(x:number)=>void} setTimeScale
 * @property {(p:string)=>void} setParadigm
 * @property {(a:"ar"|"diffusion")=>void} setArchitecture
 * @property {((cb:(status:string)=>void)=>void)=} onStatus
 * @property {()=>void} dispose
 */
