// THE swap point between fake and live telemetry. Change one line, nothing else.
import { createSimulatorSource } from "../sim/TrainingSimulator";
// import { createSocketSource } from "./socketAdapter";

export const createTelemetrySource = () => createSimulatorSource();
// export const createTelemetrySource = () =>
//   createSocketSource({ url: import.meta.env.VITE_TELEMETRY_WS ?? "ws://localhost:9600/ws/telemetry" });
