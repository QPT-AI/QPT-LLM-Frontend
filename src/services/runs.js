import { API_BASE } from "../config/constants";

// Client for the Monitor's run API: allowlisted trainers, run start/cancel, live SSE events.

async function request(path, init) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(detailMessage(body?.detail) || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// FastAPI errors: a string, or (422) a list of { loc, msg }.
function detailMessage(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc ?? []).filter((l) => l !== "body").join(".")}: ${d.msg}`).join("; ");
  }
  return "";
}

/** @returns {Promise<{name:string, description:string, params:object[]}[]>} */
export const listTrainers = () => request("/trainers");

/** @returns {Promise<{run_id:string, status:string}>} */
export const startRun = (trainer, params) => request("/runs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ trainer, params }),
});

/** @returns {Promise<{run_id:string, status:string, exit_code:number|null}>} */
export const cancelRun = (runId) => request(`/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" });

export const runEventsUrl = (runId, types) =>
  `${API_BASE}/runs/${encodeURIComponent(runId)}/events${types ? `?types=${types}` : ""}`;

export const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);
