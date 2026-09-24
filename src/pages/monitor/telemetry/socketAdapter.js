// WebSocket-backed TelemetrySource. Same interface as the simulator; records
// are forwarded untouched (they must already match telemetry/schema.js).
import { isTelemetryRecord } from "./schema";

export function createSocketSource({ url, maxBackoffMs = 30000 } = {}) {
  const subs = new Set();
  const statusCbs = new Set();
  let ws = null;
  let started = false;
  let disposed = false;
  let backoff = 1000;
  let retryTimer = null;

  const status = (s) => { for (const cb of statusCbs) cb(s); };
  const deliver = (r) => { if (started && isTelemetryRecord(r)) for (const cb of subs) cb(r); };
  const send = (obj) => { if (ws?.readyState === 1) ws.send(JSON.stringify(obj)); };

  function open() {
    if (disposed || ws || !url) return;
    status("connecting");
    ws = new WebSocket(url);
    ws.onopen = () => { backoff = 1000; status("live"); };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (Array.isArray(data)) data.forEach(deliver); else deliver(data);
      } catch { /* ignore malformed frames */ }
    };
    ws.onerror = () => status("error");
    ws.onclose = () => {
      ws = null;
      if (disposed || !started) return;
      status("connecting");
      retryTimer = setTimeout(open, backoff);
      backoff = Math.min(maxBackoffMs, backoff * 2);
    };
  }

  function close() {
    clearTimeout(retryTimer);
    retryTimer = null;
    if (ws) { ws.onclose = null; ws.close(); ws = null; }
  }

  return {
    kind: "socket",
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    onStatus(cb) { statusCbs.add(cb); },
    start() { started = true; open(); },
    pause() { started = false; close(); status("awaiting"); },
    setTimeScale() { /* wall-clock feed; not applicable */ },
    setParadigm(paradigm) { send({ record_type: "control", paradigm }); },
    setArchitecture(architecture) { send({ record_type: "control", architecture }); },
    dispose() { disposed = true; started = false; close(); subs.clear(); statusCbs.clear(); },
  };
}
