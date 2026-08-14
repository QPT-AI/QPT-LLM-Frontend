import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

// ─── Data ─────────────────────────────────────────────────────────────────────

const COMPONENTS = [
  {
    label: "Tokenizer",
    paradigm: "classical",
    rationale:
      "Fast, deterministic text segmentation. Classical CPUs handle BPE / WordPiece lookups with maximum throughput and zero overhead.",
  },
  {
    label: "Token Embeddings",
    paradigm: "quantum",
    rationale:
      "Quantum superposition encodes exponentially richer semantic geometry — each token lives in a high-dimensional Hilbert space simultaneously.",
  },
  {
    label: "Positional Encoding",
    paradigm: "photonic",
    rationale:
      "Phase-encoded light represents sinusoidal position signals naturally. Photonic waveguides propagate encoding at near-zero energy cost.",
  },
  {
    label: "Attention Mechanism",
    paradigm: "photonic",
    rationale:
      "Matrix products in attention map perfectly to optical dot-product arrays, enabling massively parallel QKV projections at the speed of light.",
  },
  {
    label: "Feed-Forward (MLP)",
    paradigm: "photonic",
    rationale:
      "Dense linear layers are the ideal photonic workload — optical multiply-accumulate units execute billions of MACs per watt.",
  },
  {
    label: "Normalization",
    paradigm: "thermo",
    rationale:
      "Layer norm mirrors thermodynamic equilibration. Stochastic normalization hardware exploits Boltzmann statistics for energy-efficient variance estimation.",
  },
  {
    label: "Residual Connections",
    paradigm: "classical",
    rationale:
      "Skip connections are memory-bus wiring — classical SRAM crossbars handle additive bypass paths with minimal latency penalty.",
  },
  {
    label: "Transformer Blocks",
    paradigm: "classical",
    rationale:
      "Orchestration logic — scheduling, tiling, layer sequencing — demands classical deterministic control flow and precise state management.",
  },
  {
    label: "Output Projection",
    paradigm: "quantum",
    rationale:
      "Quantum interference patterns collapse the attention manifold into a compressed vocabulary projection, exploiting amplitude encoding for O(log N) ops.",
  },
  {
    label: "Softmax / Prob. Dist",
    paradigm: "thermo",
    rationale:
      "The Boltzmann distribution is thermodynamics applied directly. Analog thermal hardware computes softmax via physical energy minimisation in microseconds.",
  },
  {
    label: "Sampling / Decoding",
    paradigm: "thermo",
    rationale:
      "Temperature-controlled stochastic sampling maps exactly to annealing hardware — adjusting thermal noise directly tunes creativity vs. determinism.",
  },
];

const PARADIGM_META = {
  classical: {
    color: "var(--ternary)",
    bg: "rgba(138,138,138,0.08)",
    border: "rgba(138,138,138,0.28)",
    glow: "none",
    short: "Classical",
    label: "Classical · CMOS",
    pillClass: "scene5-pill-classical",
  },
  quantum: {
    color: "var(--quantum)",
    bg: "rgba(91,173,30,0.1)",
    border: "rgba(91,173,30,0.45)",
    glow: "0 0 14px rgba(91,173,30,0.22)",
    short: "Quantum",
    label: "Quantum · QPU",
    pillClass: "scene5-pill-quantum",
  },
  photonic: {
    color: "var(--photonic)",
    bg: "rgba(240,171,0,0.1)",
    border: "rgba(240,171,0,0.45)",
    glow: "0 0 14px rgba(240,171,0,0.18)",
    short: "Photonic",
    label: "Photonic · OPU",
    pillClass: "scene5-pill-photonic",
  },
  thermo: {
    color: "var(--thermo)",
    bg: "rgba(232,105,10,0.1)",
    border: "rgba(232,105,10,0.45)",
    glow: "0 0 14px rgba(232,105,10,0.18)",
    short: "Thermo",
    label: "Thermodynamic",
    pillClass: "scene5-pill-thermo",
  },
};

const ANIM_STEP_MS = 320;
const ANIM_START_DELAY_MS = 500;

// ─── CSS injected once ─────────────────────────────────────────────────────────
const SCENE5_CSS = `
.scene5-root { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.scene5-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 860px;
  padding: clamp(20px, 4vw, 48px);
  border: 1px solid var(--hairline);
  background: var(--surface);
  backdrop-filter: blur(8px);
  border-radius: 4px;
  opacity: 0;
  transform: translateY(10px);
  animation: scene5CardIn 900ms var(--ease-out) 160ms forwards;
}
@keyframes scene5CardIn { to { opacity: 1; transform: none; } }

/* Header */
.scene5-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--hairline);
}
.scene5-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.15rem, 3vw, 2rem);
  letter-spacing: -0.01em;
  line-height: 1.1;
  margin: 4px 0 0;
}
.scene5-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.scene5-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ink-dim);
}
.scene5-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Layout */
.scene5-layout {
  display: grid;
  grid-template-columns: 1fr 188px;
  gap: 18px;
  align-items: start;
}
@media (max-width: 680px) {
  .scene5-layout { grid-template-columns: 1fr; }
  .scene5-sidebar { display: none; }
}

/* Diagram */
.scene5-diagram { display: flex; flex-direction: column; gap: 6px; }

.scene5-node-row {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 8px;
}
.scene5-node-idx {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: var(--ink-faint);
  text-align: right;
  line-height: 1;
  flex-shrink: 0;
}
.scene5-node-bar {
  height: 38px;
  border-radius: 5px;
  border: 1.5px solid transparent;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: default;
  overflow: hidden;
  position: relative;
  transition:
    background 680ms var(--ease-out),
    border-color 680ms var(--ease-out),
    box-shadow 680ms var(--ease-out),
    transform 200ms var(--ease-out);
  appearance: none;
  -webkit-appearance: none;
  text-align: left;
  font: inherit;
  outline: none;
  width: 100%;
}
.scene5-node-bar:focus-visible {
  outline: 2px solid var(--quantum);
  outline-offset: 2px;
}
.scene5-node-bar.transitioning {
  animation: scene5NodePop 600ms var(--ease-out) forwards;
}
@keyframes scene5NodePop {
  0%   { transform: scaleX(0.97); opacity: 0.65; }
  42%  { transform: scaleX(1.01); opacity: 1; }
  100% { transform: scaleX(1);    opacity: 1; }
}
.scene5-node-bar::before {
  content: "";
  position: absolute;
  inset: 0;
  width: 50%;
  background: rgba(255,255,255,0.14);
  opacity: 0;
  left: -100%;
  border-radius: inherit;
}
.scene5-node-bar.transitioning::before {
  animation: scene5Scan 600ms var(--ease-out) forwards;
}
@keyframes scene5Scan {
  0%   { opacity: 0; left: -60%; }
  40%  { opacity: 1; }
  100% { opacity: 0; left: 180%; }
}

.scene5-node-label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.76rem;
  letter-spacing: -0.01em;
  white-space: nowrap;
  position: relative;
  z-index: 1;
  transition: color 500ms;
  display: flex;
  align-items: center;
  gap: 6px;
}
.scene5-node-marker {
  font-size: 6px;
  opacity: 0.7;
  line-height: 1;
}

/* Pills */
.scene5-pill {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 600ms var(--ease-out);
}
.scene5-pill-classical { background: rgba(138,138,138,0.12); color: var(--ternary);   border: 1px solid rgba(138,138,138,0.28); }
.scene5-pill-quantum   { background: rgba(91,173,30,0.12);   color: var(--quantum);    border: 1px solid rgba(91,173,30,0.32); }
.scene5-pill-photonic  { background: rgba(240,171,0,0.12);   color: #b07c00;           border: 1px solid rgba(240,171,0,0.32); }
.scene5-pill-thermo    { background: rgba(232,105,10,0.12);  color: var(--thermo);     border: 1px solid rgba(232,105,10,0.32); }

/* Sidebar */
.scene5-sidebar { display: flex; flex-direction: column; gap: 10px; position: sticky; top: 0; }

.scene5-info-card {
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--bg-raise);
  padding: 14px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 380ms var(--ease-out), transform 380ms var(--ease-out);
  min-height: 120px;
}
.scene5-info-card.visible { opacity: 1; transform: none; }
.scene5-info-paradigm {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
}
.scene5-info-component {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 8px;
  line-height: 1.2;
}
.scene5-info-desc {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  line-height: 1.55;
  color: var(--ink-dim);
  margin: 0;
}

/* Progress dots */
.scene5-progress {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.scene5-p-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--hairline);
  transition: all 280ms;
  display: inline-block;
  flex-shrink: 0;
}
.scene5-p-dot.active { transform: scale(1.5); }

/* Controls */
.scene5-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid var(--hairline);
  margin-top: 14px;
}
.scene5-status {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-left: auto;
}

@media (prefers-reduced-motion: reduce) {
  .scene5-node-bar,
  .scene5-info-card,
  .scene5-pill { transition-duration: 0.001ms !important; }
  .scene5-node-bar.transitioning,
  .scene5-node-bar.transitioning::before,
  .scene5-card { animation-duration: 0.001ms !important; }
}
`;

function injectStyles() {
  if (document.getElementById("scene5-styles")) return;
  const el = document.createElement("style");
  el.id = "scene5-styles";
  el.textContent = SCENE5_CSS;
  document.head.appendChild(el);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NodeBar({ comp, idx, paradigm, isTransitioning, onHover }) {
  const meta = PARADIGM_META[paradigm];
  return (
    <div className="scene5-node-row">
      <span className="scene5-node-idx">{String(idx + 1).padStart(2, "0")}</span>
      <button
        className={[
          "scene5-node-bar",
          isTransitioning ? "transitioning" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          background: meta.bg,
          borderColor: meta.border,
          boxShadow: paradigm !== "classical" ? meta.glow : "none",
        }}
        onMouseEnter={() => onHover(idx)}
        onFocus={() => onHover(idx)}
        aria-label={`${comp.label} — ${meta.short}`}
      >
        <span
          className="scene5-node-label"
          style={{ color: paradigm !== "classical" ? meta.color : undefined }}
        >
          {comp.label}
          {paradigm !== "classical" && (
            <span className="scene5-node-marker" aria-hidden="true">◆</span>
          )}
        </span>
      </button>
      <span className={`scene5-pill ${meta.pillClass}`}>{meta.short}</span>
    </div>
  );
}

function InfoCard({ active, comp, paradigm }) {
  const meta = PARADIGM_META[paradigm ?? "classical"];
  return (
    <div className={`scene5-info-card${active ? " visible" : ""}`}>
      <span className="scene5-info-paradigm" style={{ color: meta.color }}>
        {meta.label}
      </span>
      <p className="scene5-info-component">{comp?.label ?? "—"}</p>
      <p className="scene5-info-desc">
        {comp?.rationale ?? "Hover a step to explore the computing paradigm."}
      </p>
    </div>
  );
}

function ProgressDots({ count, active, paradigm }) {
  const meta = PARADIGM_META[paradigm ?? "classical"];
  return (
    <div className="scene5-progress">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`scene5-p-dot${i === active ? " active" : ""}`}
          style={i === active ? { background: meta.color } : undefined}
        />
      ))}
    </div>
  );
}

// ─── Main Scene ────────────────────────────────────────────────────────────────

export default function Scene5() {
  const { t } = useTranslation();

  useEffect(() => { injectStyles(); }, []);

  const [states, setStates] = useState(() => COMPONENTS.map(() => "classical"));
  const [transitioning, setTransitioning] = useState(() => COMPONENTS.map(() => false));
  const [focused, setFocused] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [statusLabel, setStatusLabel] = useState("All classical");

  const timerRef = useRef(null);
  const stepRef = useRef(0);
  const hasAutoRun = useRef(false);

  const clearAnim = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const setNodeParadigm = useCallback((i, paradigm) => {
    setStates((prev) => {
      const next = [...prev];
      next[i] = paradigm;
      return next;
    });
    setTransitioning((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
    setTimeout(() => {
      setTransitioning((prev) => {
        const next = [...prev];
        next[i] = false;
        return next;
      });
    }, 720);
  }, []);

  // runStep uses a ref to avoid stale closure
  const runStepRef = useRef(null);
  runStepRef.current = () => {
    const i = stepRef.current;
    if (i >= COMPONENTS.length) {
      setIsAnimating(false);
      setStatusLabel("Hybrid config active");
      setFocused(COMPONENTS.length - 1);
      return;
    }
    setNodeParadigm(i, COMPONENTS[i].paradigm);
    setFocused(i);
    setStatusLabel(`Step ${i + 1} / ${COMPONENTS.length}`);
    stepRef.current = i + 1;
    timerRef.current = setTimeout(() => runStepRef.current(), ANIM_STEP_MS);
  };

  const resetAll = useCallback((animate = true) => {
    clearAnim();
    setIsAnimating(false);
    stepRef.current = 0;
    setStatusLabel("All classical");
    setFocused(null);
    if (animate) {
      COMPONENTS.forEach((_, i) => setNodeParadigm(i, "classical"));
    } else {
      setStates(COMPONENTS.map(() => "classical"));
      setTransitioning(COMPONENTS.map(() => false));
    }
  }, [clearAnim, setNodeParadigm]);

  const showAll = useCallback(() => {
    clearAnim();
    setIsAnimating(false);
    stepRef.current = 0;
    setStatusLabel("Hybrid config active");
    setStates(COMPONENTS.map((c) => c.paradigm));
    setTransitioning(COMPONENTS.map(() => false));
    setFocused(COMPONENTS.length - 1);
  }, [clearAnim]);

  const startAnimation = useCallback(() => {
    if (isAnimating) return;
    setStates(COMPONENTS.map(() => "classical"));
    setTransitioning(COMPONENTS.map(() => false));
    setFocused(null);
    setIsAnimating(true);
    stepRef.current = 0;
    setStatusLabel("Optimising…");
    timerRef.current = setTimeout(() => runStepRef.current(), ANIM_START_DELAY_MS);
  }, [isAnimating]);

  // Auto-start once
  useEffect(() => {
    if (hasAutoRun.current) return;
    hasAutoRun.current = true;
    timerRef.current = setTimeout(() => startAnimation(), ANIM_START_DELAY_MS);
    return clearAnim;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const focusedComp = focused !== null ? COMPONENTS[focused] : null;
  const focusedParadigm = focused !== null ? states[focused] : "classical";

  return (
    <div className="scene-inner scene5-root">

      {/* Ambient relics */}
      <div className="ambient-relics" aria-hidden="true">
        <span
          className="relic-blob"
          style={{ width: 280, height: 280, top: "6%", left: "2%", background: "#5bad1e" }}
        />
        <span
          className="relic-blob"
          style={{ width: 220, height: 220, bottom: "4%", right: "3%", background: "#e8690a" }}
        />
        <span
          className="relic-blob"
          style={{ width: 180, height: 180, top: "40%", right: "18%", background: "#f0ab00", animationDelay: "-7s" }}
        />
        <svg
          className="relic-wave"
          width="70%"
          height="160"
          style={{ top: "50%", left: "15%", marginTop: -80 }}
          viewBox="0 0 700 160"
          aria-hidden="true"
        >
          <path
            d="M0,80 C80,16 160,144 240,80 C320,16 400,144 480,80 C560,16 640,144 700,80"
            fill="none"
            stroke="#f0ab00"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Main card */}
      <div className="scene5-card intro-card">

        {/* Header */}
        <div className="scene5-header">
          <div>
            <span className="eyebrow stroke-hair">
              <span className="eyebrow-dot" style={{ background: "var(--quantum)" }} />
              {t("scene5.eyebrow", "QPT · Hybrid Architecture")}
            </span>
            <h2 className="scene5-title">
              {t("scene5.title", "Hybrid LLM")}
            </h2>
          </div>
          <div className="scene5-legend">
            {Object.entries(PARADIGM_META).map(([key, m]) => (
              <div key={key} className="scene5-legend-item">
                <span className="scene5-legend-dot" style={{ background: m.color }} />
                <span>{m.short}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Diagram + Sidebar */}
        <div className="scene5-layout">
          <div className="scene5-diagram">
            {COMPONENTS.map((comp, i) => (
              <NodeBar
                key={i}
                idx={i}
                comp={comp}
                paradigm={states[i]}
                isTransitioning={transitioning[i]}
                onHover={setFocused}
              />
            ))}
          </div>

          <div className="scene5-sidebar">
            <InfoCard
              active={focused !== null}
              comp={focusedComp}
              paradigm={focusedParadigm}
            />
            <ProgressDots
              count={COMPONENTS.length}
              active={focused}
              paradigm={focusedParadigm}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="scene5-controls">
          <button
            className="footer-btn primary"
            onClick={startAnimation}
            disabled={isAnimating}
          >
            {isAnimating ? "Animating…" : "▶ Animate"}
          </button>
          <button className="footer-btn ghost" onClick={() => resetAll(true)}>
            Reset
          </button>
          <button className="footer-btn ghost" onClick={showAll}>
            Show all
          </button>
          <span className="scene5-status">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}