// Per-frame mutable state shared between the telemetry ingest and the 3D scene.
// HARD RULE: nothing in here is React state. useFrame reads it; ingest writes it.
// Nothing here ever triggers a React re-render.
import { N_BLOCKS, SEQ_VIS } from "../pages/monitor/telemetry/schema";

export const frame = {
  time: 0,             // scene clock (stops when paused)
  timeScale: 1,
  paused: false,

  stepAt: -1e9,        // scene time of the last train record (drives the forward/backward pulse)
  stepTick: 0,
  gradNorm: 0.5,
  lossNorm: 1,

  layerEnergy: new Float32Array(N_BLOCKS).fill(0.5), // normalised pct_of_step per block
  gradShare: new Float32Array(N_BLOCKS).fill(1 / N_BLOCKS),

  tokens: {
    mode: "ar",
    count: 0,
    confidences: new Float32Array(SEQ_VIS),
    timestep: 1000,
  },

  energyGauge: 1,
  utilization: 0.8,
  temperature: 0.5,

  diagramHeight: 20, // world-unit height of the architecture stack (target state), read by the camera fit
};

export function resetFrame() {
  frame.stepAt = -1e9;
  frame.stepTick = 0;
  frame.layerEnergy.fill(0.5);
  frame.gradShare.fill(1 / N_BLOCKS);
  frame.tokens.count = 0;
  frame.tokens.confidences.fill(0);
  frame.energyGauge = 1;
}
