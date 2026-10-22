// THE swap point between fake and live telemetry.
//   sim  → client-side simulator (synthetic data)
//   real → backend run streamed over SSE (GET /runs/{id}/events); null until a run is attached
import { createSimulatorSource } from "../sim/TrainingSimulator";
import { createRunSource } from "./runSource";

export function createTelemetrySource({ dataMode = "sim", runId = null } = {}) {
  if (dataMode !== "real") return createSimulatorSource();
  return runId ? createRunSource({ runId }) : null;
}
