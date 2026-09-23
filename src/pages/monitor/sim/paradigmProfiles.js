// Plausible, clearly distinct performance envelopes per compute substrate.
// Each numeric field is a [min, max] range; a fresh target is drawn on every
// paradigm switch and the live value drifts toward it (τ ≈ 0.6 s → ~96 % in 2 s).

export const PROFILES = {
  classical: {
    tokPerS: [38e3, 48e3], jPerTok: [0.9, 1.3], latencyMs: [18, 26], errorRate: [1e-5, 3e-5],
    utilization: [78, 94], vramGb: [62, 71], powerW: [620, 720], costPerWh: [1.5e-4, 1.5e-4],
    thermal: [62, 78], thermalUnit: "°C",
  },
  quantum: {
    tokPerS: [4e3, 9e3], jPerTok: [0.05, 0.12], latencyMs: [90, 160], errorRate: [2e-3, 8e-3],
    utilization: [30, 55], vramGb: [8, 14], powerW: [1800, 2600], costPerWh: [4.0e-4, 4.0e-4],
    thermal: [15, 22], thermalUnit: "mK",
  },
  photonic: {
    tokPerS: [120e3, 180e3], jPerTok: [0.08, 0.15], latencyMs: [3, 6], errorRate: [2e-4, 5e-4],
    utilization: [60, 85], vramGb: [24, 32], powerW: [180, 260], costPerWh: [1.2e-4, 1.2e-4],
    thermal: [35, 45], thermalUnit: "°C",
  },
  thermodynamic: {
    tokPerS: [15e3, 30e3], jPerTok: [0.02, 0.05], latencyMs: [40, 70], errorRate: [8e-3, 2e-2],
    utilization: [50, 70], vramGb: [16, 24], powerW: [90, 140], costPerWh: [1.0e-4, 1.0e-4],
    thermal: [300, 340], thermalUnit: "K",
  },
};

const NUMERIC = ["tokPerS", "jPerTok", "latencyMs", "errorRate", "utilization", "vramGb", "powerW", "costPerWh", "thermal"];

export function drawTarget(paradigm, rng) {
  const p = PROFILES[paradigm];
  const out = { paradigm, thermalUnit: p.thermalUnit };
  for (const k of NUMERIC) out[k] = rng.range(p[k][0], p[k][1]);
  return out;
}

export function driftToward(cur, target, dt, tau = 0.6) {
  const a = 1 - Math.exp(-dt / tau);
  for (const k of NUMERIC) cur[k] += (target[k] - cur[k]) * a;
  cur.thermalUnit = target.thermalUnit;
  cur.paradigm = target.paradigm;
}

/** Slow random walk of the target inside its envelope so values never sit still. */
export function jitterTarget(target, rng, dt) {
  const p = PROFILES[target.paradigm];
  for (const k of NUMERIC) {
    const [lo, hi] = p[k];
    if (hi === lo) continue;
    const v = target[k] + rng.gauss() * (hi - lo) * 0.08 * Math.sqrt(dt);
    target[k] = Math.min(hi, Math.max(lo, v));
  }
}

/** 0..1 position of the thermal reading inside the paradigm envelope. */
export function heatOf(cur) {
  const [lo, hi] = PROFILES[cur.paradigm].thermal;
  return Math.min(1, Math.max(0, (cur.thermal - lo) / (hi - lo)));
}
