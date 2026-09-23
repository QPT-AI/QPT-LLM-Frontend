// Pure math for the fake training run: seeded RNG, loss/LR/grad-norm curves.

export const TOTAL_STEPS = 20000;
export const WARMUP_STEPS = 500;
export const LR_MAX = 3e-4;
export const LR_MIN = 3e-5;
export const LR_SAFE = 2.4e-4;          // above this the val loss starts to drift away
export const TOKENS_PER_STEP = 32 * 1024;
export const DATASET_TOKENS = 3.3e8;    // one epoch ≈ 10k steps
export const MODEL_PARAMS = 124e6;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    gauss() {
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    range: (a, b) => a + (b - a) * next(),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

export const lossBase = (s) => 25 * Math.pow(s + 20, -0.35) + 1.4;

export function lrAt(s) {
  if (s < WARMUP_STEPS) return (LR_MAX * s) / WARMUP_STEPS;
  const t = Math.min(1, (s - WARMUP_STEPS) / (TOTAL_STEPS - WARMUP_STEPS));
  return LR_MIN + 0.5 * (LR_MAX - LR_MIN) * (1 + Math.cos(Math.PI * t));
}

export const paramNormAt = (s) => 780 + 0.6 * Math.pow(s, 0.55);
export const epochAt = (s) => Math.floor((s * TOKENS_PER_STEP) / DATASET_TOKENS);

/** AR(1) coloured noise plus a little white noise. */
export function createNoise(rng) {
  let n = 0;
  return () => {
    n = 0.9 * n + 0.1 * rng.gauss() * 0.08;
    return n + rng.gauss() * 0.03;
  };
}

/** Occasional plateaus: a slow bump that flattens the descent for ~600 steps. */
export function createPlateaus(rng) {
  const LEN = 600;
  let start = 3000 + rng.gauss() * 800;
  return (s) => {
    if (s > start + LEN) start = s + 2400 + Math.abs(rng.gauss()) * 800;
    if (s >= start && s <= start + LEN) return 0.12 * Math.sin((Math.PI * (s - start)) / LEN);
    return 0;
  };
}

export function gradNormSample(s, rng) {
  return (0.45 + 0.4 * Math.exp(-s / 3000)) * Math.exp(0.25 * rng.gauss());
}
