// Live telemetry from a backend run: GET /runs/{id}/events (Server-Sent Events).
//
// Wire format (one JSON object per named event, every object carries `ts` and `type`):
//   event: status  {"status":"running"|"succeeded"|"failed"|"cancelled", "exit_code"?}
//   event: train   {"step":1, ...metrics}      e.g. counter → {"step":1,"value":1}
//   event: val     {"step":…, "val_loss":…}
//   event: log     {"stream":"stdout"|"stderr", "message":"…"}
// Trainers that already emit full schema records (record_type set) pass through untouched.
// The server replays the whole run on every (re)connect and closes after a terminal status.
import { isTelemetryRecord } from "./schema";
import { runEventsUrl, TERMINAL_STATUSES } from "../../../services/runs";

const EVENT_TYPES = ["train", "val", "log", "status"];

/** @returns {import("./schema").TelemetrySource & { runId:string }} */
export function createRunSource({ runId }) {
  const subs = new Set();
  const statusSubs = new Set();
  let es = null;
  let paused = false;
  let terminal = false;
  let delivered = 0;   // events handled so far, across reconnects
  let seen = 0;        // events received on the current connection
  let startTs = null, lastTrain = null, lastStep = 0;

  const emit = (r) => { if (!paused) for (const cb of subs) cb(r); };
  const setStatus = (s) => { for (const cb of statusSubs) cb(s); };
  const log = (level, msg) => emit({ record_type: "log", level, msg, step: lastStep, epoch: 0 });

  function handle(type, raw) {
    // Reconnects replay from the start; skip what was already handled.
    if (++seen <= delivered) return;
    delivered++;

    let data;
    try { data = JSON.parse(raw); } catch { data = { message: String(raw) }; }
    if (data == null || typeof data !== "object") data = { message: String(data) };

    const ts = Date.parse(data.ts);
    if (startTs == null && Number.isFinite(ts)) startTs = ts;

    if (isTelemetryRecord(data)) {
      lastStep = data.step;
      emit(data);
      return;
    }
    switch (data.type ?? type) {
      case "status": {
        const status = data.status;
        if (TERMINAL_STATUSES.has(status)) {
          terminal = true;
          const code = data.exit_code != null ? ` (exit ${data.exit_code})` : "";
          log(status === "failed" ? "error" : "info", `run ${status}${code}`);
          setStatus(status);
          close();
        } else {
          setStatus("live");
        }
        return;
      }
      case "train": {
        const r = toStepRecord("train", data, ts);
        if (lastTrain && Number.isFinite(ts) && r.step > lastTrain.step && ts > lastTrain.ts) {
          r.steps_per_s ??= (r.step - lastTrain.step) / ((ts - lastTrain.ts) / 1000);
        }
        lastTrain = { step: r.step, ts };
        emit(r);
        return;
      }
      case "val":
        emit(toStepRecord("val", data, ts));
        return;
      case "log": {
        const level = data.level ?? (data.stream === "stderr" ? "warn" : "info");
        log(level, data.msg ?? data.message ?? JSON.stringify(data));
        return;
      }
      default:
    }
  }

  function toStepRecord(recordType, data, ts) {
    const step = Number.isFinite(data.step) ? data.step : lastStep + 1;
    lastStep = step;
    const elapsed = Number.isFinite(ts) && startTs != null ? (ts - startTs) / 1000 : undefined;
    return { elapsed_s: elapsed, ...data, record_type: recordType, split: recordType, step, epoch: data.epoch ?? 0 };
  }

  function open() {
    if (es || terminal) return;
    setStatus("connecting");
    es = new EventSource(runEventsUrl(runId, EVENT_TYPES.join(",")));
    es.onopen = () => { seen = 0; };
    for (const t of EVENT_TYPES) es.addEventListener(t, (e) => handle(t, e.data));
    es.onmessage = (e) => handle("message", e.data);
    es.onerror = () => {
      if (terminal || !es) return;
      // CLOSED = the server refused the stream (e.g. 404 unknown run); otherwise EventSource retries.
      if (es.readyState === EventSource.CLOSED) {
        es = null;
        log("error", `run ${runId}: event stream unavailable`);
      }
      setStatus("error");
    };
  }

  function close() {
    es?.close();
    es = null;
  }

  return {
    kind: "live",
    runId,
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    onStatus(cb) { statusSubs.add(cb); },
    start() { paused = false; open(); },
    pause() { paused = true; },
    setTimeScale() {},
    setParadigm() {},
    setArchitecture() {},
    dispose() { close(); subs.clear(); statusSubs.clear(); },
  };
}
