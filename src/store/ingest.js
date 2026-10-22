// Reduces one telemetry record into the zustand store and the per-frame state.
// Exactly one set() per record. Ring buffers are mutated in place and consumers
// re-render on seriesVersion / perLayerVersion.
import { BLOCK_KEYS, N_BLOCKS } from "../pages/monitor/telemetry/schema";
import { frame } from "./frameState";

let logId = 0;

// Live trainers may send sparse records (e.g. only step + value); never push NaN into a series.
const pushIf = (buf, v) => { if (Number.isFinite(v)) buf.push(v); };

export function makeLog(level, msg, step = 0) {
  return { id: ++logId, ts: Date.now(), step, level, msg };
}

function pushLog(s, level, msg, step) {
  return [makeLog(level, msg, step), ...s.logs].slice(0, 200);
}

function mergeLayer(s, r, pick) {
  const perLayer = s.perLayer.map((row, i) => {
    const v = r.per_layer?.[BLOCK_KEYS[i]];
    return v === undefined ? row : { ...row, ...pick(v) };
  });
  return { perLayer, perLayerVersion: s.perLayerVersion + 1 };
}

export function ingestRecord(r, set, get) {
  switch (r.record_type) {
    case "train": return ingestTrain(r, set, get);
    case "val": return set((s) => {
      const fresh = s.derived.lastValStep !== r.step;
      if (fresh) pushIf(s.series.valLoss, r.val_loss);
      const prev = s.latest.val;
      return {
        latest: { ...s.latest, val: r },
        seriesVersion: s.seriesVersion + 1,
        derived: { ...s.derived, lastValStep: r.step, valDelta: Number.isFinite(prev?.val_loss) && Number.isFinite(r.val_loss) ? r.val_loss - prev.val_loss : 0 },
      };
    });
    case "profile": return set((s) => {
      pushIf(s.series.power, r.avg_power_w);
      return { latest: { ...s.latest, profile: r }, seriesVersion: s.seriesVersion + 1 };
    });
    case "layer_energy_cost": {
      let max = 1e-9;
      for (const k of BLOCK_KEYS) max = Math.max(max, r.per_layer?.[k]?.pct_of_step ?? 0);
      for (let i = 0; i < N_BLOCKS; i++) {
        const v = r.per_layer?.[BLOCK_KEYS[i]];
        if (v) frame.layerEnergy[i] = v.pct_of_step / max;
      }
      return set((s) => mergeLayer(s, r, (v) => ({
        time_ms: v.time_ms, pct_of_step: v.pct_of_step, energy_j: v.energy_j, cost_usd: v.cost_usd,
      })));
    }
    case "gradient_contribution": {
      for (let i = 0; i < N_BLOCKS; i++) {
        const v = r.per_layer?.[BLOCK_KEYS[i]];
        if (Number.isFinite(v)) frame.gradShare[i] = v;
      }
      return set((s) => mergeLayer(s, r, (v) => ({ gradContrib: v })));
    }
    case "param_update_ratio":
      return set((s) => mergeLayer(s, r, (v) => ({
        param_norm: v.param_norm, update_norm: v.update_norm, ratio: v.ratio,
      })));
    case "attention_stats":
      return set((s) => ({
        latest: { ...s.latest, attention: r },
        ...mergeLayer(s, r, (heads) => {
          const n = heads.length || 1;
          const mean = (k) => heads.reduce((a, h) => a + (h[k] ?? 0), 0) / n;
          return { attn_entropy: mean("entropy"), attn_distance: mean("avg_distance"), attn_redundancy: mean("redundancy") };
        }),
      }));
    case "block_ablation":
      return set((s) => ({
        latest: { ...s.latest, ablation: r },
        ...mergeLayer(s, r, (v) => ({
          ablated_loss: v.ablated_loss, delta_loss: v.delta_loss, delta_ppl: v.delta_ppl,
        })),
      }));
    case "tokens": {
      const t = frame.tokens;
      t.mode = r.mode;
      t.count = r.tokens.length;
      t.timestep = r.timestep ?? 1000;
      for (let i = 0; i < t.confidences.length; i++) t.confidences[i] = r.confidences[i] ?? 0;
      return set((s) => ({ latest: { ...s.latest, tokens: r } }));
    }
    case "substrate": {
      frame.energyGauge = r.energy_gauge;
      frame.utilization = r.utilization / 100;
      frame.temperature = r.heat;
      return set((s) => ({ latest: { ...s.latest, substrate: r } }));
    }
    case "log":
      return set((s) => ({ logs: pushLog(s, r.level, r.msg, r.step) }));
    default:
      return undefined;
  }
}

function ingestTrain(r, set, get) {
  const s = get();
  const prev = s.latest.train;
  const { series } = s;
  pushIf(series.loss, r.loss);
  pushIf(series.lr, r.learning_rate);
  pushIf(series.gradNorm, r.gradient_norm);
  pushIf(series.stepsPerS, r.steps_per_s);
  pushIf(series.vram, r.vram_gb);
  pushIf(series.cost, r.cumulative_cost_usd);
  const ept = r.hardware_energy_joules_per_token ?? series.energyPerToken.last();
  if (Number.isFinite(ept)) series.energyPerToken.push(ept);

  let tokensPerStep = s.derived.tokensPerStep;
  if (prev && r.step > prev.step && r.tokens_processed > prev.tokens_processed) {
    tokensPerStep = (r.tokens_processed - prev.tokens_processed) / (r.step - prev.step);
  }
  if (Number.isFinite(r.tokens_processed)) pushIf(series.tokensPerS, r.steps_per_s * tokensPerStep);

  let lastValStep = s.derived.lastValStep;
  if (Number.isFinite(r.val_loss) && r.val_step != null && r.val_step !== lastValStep) {
    series.valLoss.push(r.val_loss);
    lastValStep = r.val_step;
  }

  frame.stepAt = frame.time;
  frame.stepTick++;
  if (Number.isFinite(r.gradient_norm)) frame.gradNorm = r.gradient_norm;
  if (Number.isFinite(r.loss)) frame.lossNorm = Math.min(1, r.loss / 11);

  set({
    latest: { ...s.latest, train: r },
    seriesVersion: s.seriesVersion + 1,
    run: {
      ...s.run, step: r.step, epoch: r.epoch, modelType: r.model_type ?? s.run.modelType,
      startedAt: s.run.startedAt || Date.now() - (r.elapsed_s ?? 0) * 1000,
    },
    derived: {
      ...s.derived,
      lossDelta: Number.isFinite(prev?.loss) && Number.isFinite(r.loss) ? r.loss - prev.loss : 0,
      clipping: r.gradient_norm > 1.0,
      tokensPerStep,
      lastValStep,
    },
  });
}
