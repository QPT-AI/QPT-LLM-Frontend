import { create } from "zustand";
import { PARADIGM_META } from "../config/paradigms";
import { ARCHITECTURES } from "../config/architecture";

// Event-log copy stays English-only by design (synthetic telemetry text, not product chrome).
const ARCH_LOG_NAME = { ar: "autoregressive", diffusion: "diffusion" };
import { N_BLOCKS } from "../pages/monitor/telemetry/schema";
import { createRingBuffer as RB } from "./ringBuffer";
import { ingestRecord, makeLog } from "./ingest";
import { frame, resetFrame } from "./frameState";

const emptyLayer = () => ({
  time_ms: null, pct_of_step: null, energy_j: null, cost_usd: null, gradContrib: null,
  param_norm: null, update_norm: null, ratio: null, ablated_loss: null, delta_loss: null, delta_ppl: null,
  attn_entropy: null, attn_distance: null, attn_redundancy: null,
});

const initialUi = {
  architecture: "ar",           // which diagram is shown and which model the feed describes
  paradigm: "classical",        // substrate whose hardware readout is shown
  highlight: null,              // paradigm emphasised in the diagram (null = all)
  view: "perspective",
  viewNonce: 0,                 // bumps on every view request so "reset" re-applies the same preset
  exploded: false,              // spread each block's sub-layers apart
  paused: false, timeScale: 1,
  selected: null, hovered: null, // diagram components
  diffusionScrub: null,
  connection: "idle", sourceKind: "sim",
};

const initialData = () => ({
  run: { runId: "0x7F3A", name: "qpt-124m", modelType: "autoregressive", startedAt: 0, step: 0, epoch: 0 },
  latest: { train: null, val: null, profile: null, attention: null, ablation: null, tokens: null, substrate: null },
  series: {
    loss: RB(600), valLoss: RB(240), lr: RB(600), gradNorm: RB(600), stepsPerS: RB(300),
    tokensPerS: RB(300), energyPerToken: RB(300), power: RB(120), vram: RB(120), cost: RB(300),
  },
  seriesVersion: 0,
  perLayer: Array.from({ length: N_BLOCKS }, emptyLayer),
  perLayerVersion: 0,
  derived: { lossDelta: 0, valDelta: 0, clipping: false, tokensPerStep: 32768, lastValStep: null },
  logs: [],
});

const log = (s, level, msg) => [makeLog(level, msg, s.run.step), ...s.logs].slice(0, 200);

export const useMonitorStore = create((set, get) => ({
  ui: initialUi,
  ...initialData(),
  _source: null,
  _unsub: null,

  // ── telemetry source lifecycle ────────────────────────────────────────────
  connect(source) {
    get().disconnect();
    resetFrame();
    const unsub = source.subscribe((r) => ingestRecord(r, set, get));
    source.onStatus?.((status) => set((s) => ({
      ui: { ...s.ui, connection: status },
      logs: log(s, status === "error" ? "error" : "info", `telemetry link: ${status}`),
    })));
    const { ui } = get();
    source.setParadigm(ui.paradigm);
    source.setArchitecture(ui.architecture);
    source.setTimeScale(ui.timeScale);
    const live = source.kind !== "sim";
    set((s) => ({
      ...initialData(),
      _source: source, _unsub: unsub,
      ui: { ...s.ui, sourceKind: source.kind, connection: live ? "connecting" : "sim" },
      logs: log(s, "info", live ? "telemetry source: websocket adapter" : "telemetry source: simulator (synthetic data)"),
    }));
    if (!ui.paused) source.start();
  },
  disconnect() {
    const { _source, _unsub } = get();
    _unsub?.();
    _source?.dispose?.();
    set({ _source: null, _unsub: null });
  },

  // ── controls ──────────────────────────────────────────────────────────────
  setArchitecture(a) {
    if (!ARCHITECTURES[a] || get().ui.architecture === a) return;
    get()._source?.setArchitecture(a);
    set((s) => ({
      ui: { ...s.ui, architecture: a, diffusionScrub: null, selected: null, hovered: null },
      logs: log(s, "info", `architecture → ${ARCH_LOG_NAME[a] ?? a}`),
    }));
  },
  setParadigm(p) {
    if (!PARADIGM_META[p] || get().ui.paradigm === p) return;
    get()._source?.setParadigm(p);
    set((s) => ({ ui: { ...s.ui, paradigm: p }, logs: log(s, "info", `substrate readout → ${PARADIGM_META[p].label.toLowerCase()}`) }));
  },
  /** Legend click: emphasise one paradigm in the diagram and show its substrate readout. */
  toggleHighlight(p) {
    const { ui, setParadigm } = get();
    if (ui.highlight === p) { set((s) => ({ ui: { ...s.ui, highlight: null } })); return; }
    setParadigm(p);
    set((s) => ({ ui: { ...s.ui, highlight: p } }));
  },
  setView: (view) => set((s) => ({ ui: { ...s.ui, view, viewNonce: s.ui.viewNonce + 1 } })),
  toggleExploded: () => set((s) => ({ ui: { ...s.ui, exploded: !s.ui.exploded } })),
  togglePaused() {
    const paused = !get().ui.paused;
    const { _source } = get();
    frame.paused = paused;
    if (paused) _source?.pause(); else _source?.start();
    set((s) => ({ ui: { ...s.ui, paused }, logs: log(s, "info", paused ? "run paused" : "run resumed") }));
  },
  setTimeScale(timeScale) {
    frame.timeScale = timeScale;
    get()._source?.setTimeScale(timeScale);
    set((s) => ({ ui: { ...s.ui, timeScale } }));
  },
  setHovered: (hovered) => set((s) => ({ ui: { ...s.ui, hovered } })),
  setSelected: (selected) => set((s) => ({ ui: { ...s.ui, selected } })),
  setDiffusionScrub: (diffusionScrub) => set((s) => ({ ui: { ...s.ui, diffusionScrub } })),
  pushLog: (level, msg) => set((s) => ({ logs: log(s, level, msg) })),
}));
