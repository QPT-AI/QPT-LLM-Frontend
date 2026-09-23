// Pure-JS fake training run. Zero React. Emits backend-shaped records through
// the TelemetrySource interface (see telemetry/schema.js).
import {
  makeRng, createNoise, createPlateaus, lossBase, lrAt, paramNormAt, epochAt,
  gradNormSample, LR_SAFE, TOKENS_PER_STEP,
} from "./curves";
import { drawTarget, driftToward, jitterTarget } from "./paradigmProfiles";
import { createTokenGen } from "./tokenGen";
import { makeTrain, makeVal, makeProfile, makeTokens, makeLog, makeSubstrate } from "./recordFactories";
import {
  makeLayerEnergy, makeGradientContribution, makeParamUpdateRatio, makeAttentionStats, makeBlockAblation,
} from "./layerFactories";

const BASE_STEPS_PER_S = 10; // one train record (10 steps) per second at 1×
const TICK_MS = 100;
const AMBIENT = [
  "dataloader shard {n}/64 prefetched", "allreduce {ms} ms", "kv-cache compaction ok",
  "optimizer state synced", "tokenizer cache hit 99.{n}%", "activation checkpoint rotated",
];

export function createSimulatorSource({ seed = 0x7f3a } = {}) {
  const rng = makeRng(seed);
  const noise = createNoise(rng);
  const plateau = createPlateaus(rng);
  const tokenGen = createTokenGen(rng);
  const subs = new Set();

  let timer = null, last = 0;
  let timeScale = 1, paradigm = "classical", architecture = "ar";
  let step = 0, stepAcc = 0, nextEmit = 0, elapsed = 0, cumEnergy = 0, cumCost = 0;
  let cur = drawTarget(paradigm, rng);
  let target = { ...cur };
  let overheat = 0, warnedGap = false, gradMul = 1, gradMulLeft = 0;
  let instabLeft = 0, instabBump = 0, lastVal = null, lastEpoch = 0, records = 0, gaugePhase = 0;

  const emit = (r) => { for (const cb of subs) cb(r); };
  const ctx = () => ({ step, epoch: epochAt(step), architecture });
  const logf = (level, msg) => emit(makeLog(ctx(), level, msg));

  function emitStep() {
    records++;
    const c = ctx();
    const lr = lrAt(step);
    overheat = Math.min(0.45, Math.max(0, overheat + (lr > LR_SAFE ? (lr - LR_SAFE) * 250 : -0.02)));
    if (overheat > 0.3 && !warnedGap) { warnedGap = true; logf("warn", "val/train gap widening — lr above safe band"); }

    const spike = rng.chance(0.015) ? rng.range(2, 6) : 1;
    if (instabLeft <= 0 && step > 300 && rng.chance(0.001)) {
      instabLeft = 5; instabBump = 1.5; gradMul = Math.max(gradMul, 10); gradMulLeft = Math.max(gradMulLeft, 1);
      logf("error", `instability detected — loss spike, restoring from ckpt step-${Math.floor(step / 1000) * 1000}`);
    }
    const loss = Math.max(0.05, lossBase(step) + plateau(step) + noise() + instabBump);
    const gradNorm = gradNormSample(step, rng) * spike * (gradMulLeft > 0 ? gradMul : 1);
    if (gradNorm > 1) logf("warn", `grad_norm ${gradNorm.toFixed(2)} > 1.0 — clipped`);
    if (instabLeft > 0) { instabLeft--; instabBump *= 0.55; } else instabBump = 0;
    if (gradMulLeft > 0) gradMulLeft--; else gradMul = 1;

    if (step % 200 === 0) {
      const vl = lossBase(step) * 1.04 + overheat + rng.gauss() * 0.02;
      lastVal = { loss: vl, ppl: Math.exp(Math.min(vl, 12)), step };
      emit(makeVal(c, lastVal));
    }

    const stepsPerS = (cur.tokPerS / TOKENS_PER_STEP) * (1 + rng.gauss() * 0.03);
    const stepEnergy = cur.jPerTok * TOKENS_PER_STEP;
    cumEnergy += stepEnergy * 10;
    cumCost += (stepEnergy / 3600) * cur.costPerWh * 10;
    const m = { loss, lr, gradNorm, paramNorm: paramNormAt(step), val: lastVal, cur, rng, elapsed, stepsPerS, cumEnergy, cumCost };

    emit(makeTrain(c, m));
    emit(makeTokens(c, architecture === "ar" ? tokenGen.ar() : tokenGen.diffusion()));
    gaugePhase = (gaugePhase + 1 / 14) % 1;
    const gauge = paradigm === "thermodynamic" ? 1 - gaugePhase : 0.55 + 0.4 * (cur.utilization / 100);
    emit(makeSubstrate(c, cur, gauge, rng));

    if (step % 20 === 0) emit(makeAttentionStats(c, m));
    if (step % 100 === 0) { emit(makeLayerEnergy(c, m)); emit(makeGradientContribution(c, m)); emit(makeParamUpdateRatio(c, m)); }
    if (step % 500 === 0 && step > 0) emit(makeProfile(c, m));
    if (step % 1000 === 0 && step > 0) {
      emit(makeBlockAblation(c, m));
      logf("info", `checkpoint saved step-${step} (${(2.1 + rng.next() * 0.2).toFixed(2)} GB) · ${(3.4 + rng.next()).toFixed(1)} s`);
    }
    if (c.epoch !== lastEpoch) { lastEpoch = c.epoch; logf("info", `epoch ${c.epoch} begins`); }
    if (records % 30 === 0) {
      logf("info", rng.pick(AMBIENT).replace("{n}", String(1 + Math.floor(rng.next() * 63))).replace("{ms}", String(30 + Math.floor(rng.next() * 40))));
    }
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.5) * timeScale;
    last = now;
    elapsed += dt;
    driftToward(cur, target, dt);
    jitterTarget(target, rng, dt);
    stepAcc += BASE_STEPS_PER_S * dt;
    while (stepAcc >= nextEmit) { step = nextEmit; emitStep(); nextEmit += 10; }
  }

  return {
    kind: "sim",
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    start() {
      if (timer) return;
      last = performance.now();
      timer = setInterval(tick, TICK_MS);
      tick();
    },
    pause() { clearInterval(timer); timer = null; },
    setTimeScale(x) { timeScale = Math.max(0.05, x); },
    setParadigm(p) {
      if (p === paradigm) return;
      paradigm = p;
      target = drawTarget(p, rng);
    },
    setArchitecture(a) {
      if (a === architecture) return;
      architecture = a;
      tokenGen.reset();
    },
    onStatus() { /* the simulator is always "live" */ },
    dispose() { this.pause(); subs.clear(); },
  };
}
