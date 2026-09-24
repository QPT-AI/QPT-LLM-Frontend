// Number formatting for the HUD. Every formatter returns "---" for non-finite input.
const ok = (v) => Number.isFinite(v);

export const fmtFixed = (v, d = 3) => (ok(v) ? v.toFixed(d) : "---");
export const fmtSci = (v, d = 2) => (ok(v) ? v.toExponential(d) : "---");
export const fmtUsd = (v, d = 2) => (ok(v) ? `$${v.toFixed(d)}` : "---");
export const fmtPct = (v, d = 1) => (ok(v) ? `${v.toFixed(d)}%` : "---");
export const fmtHours = (sec) => (ok(sec) ? `${(sec / 3600).toFixed(2)} h` : "---");

export function fmtSI(v, d = 1) {
  if (!ok(v)) return "---";
  const a = Math.abs(v);
  if (a >= 1e15) return `${(v / 1e15).toFixed(d)}P`;
  if (a >= 1e12) return `${(v / 1e12).toFixed(d)}T`;
  if (a >= 1e9) return `${(v / 1e9).toFixed(d)}G`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(d)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(d)}k`;
  return v.toFixed(d);
}

export function fmtHMS(sec) {
  if (!ok(sec)) return "--:--:--";
  const s = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${r}`;
}

export function fmtDelta(v, d = 3) {
  if (!ok(v)) return "";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${Math.abs(v).toFixed(d)}`;
}

export const fmtStep = (n) => (ok(n) ? String(Math.floor(n)).padStart(6, "0") : "------");
