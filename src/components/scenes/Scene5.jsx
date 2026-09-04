import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// ── Brand palette (matches rest of app) ──────────────────────────────────────
const QUANTUM   = "#5bad1e";
const PHOTONIC  = "#f0ab00";
const THERMO    = "#e8690a";
const CLASSICAL = "#8a8a8a";

const PARADIGM_META = {
  quantum:   { color: QUANTUM,   label: "Quantum",        glyph: "Q" },
  photonic:  { color: PHOTONIC,  label: "Photonic",       glyph: "P" },
  thermo:    { color: THERMO,    label: "Thermodynamic",  glyph: "T" },
  classical: { color: CLASSICAL, label: "Classical",      glyph: "C" },
};

// LLM pipeline with paradigm assignment
const LAYERS = [
  { id: 0,  label: "Tokenizer",                paradigm: "classical" },
  { id: 1,  label: "Token Embeddings",         paradigm: "quantum"   },
  { id: 2,  label: "Positional Encoding",      paradigm: "photonic"  },
  { id: 3,  label: "Attention Mechanism",      paradigm: "photonic"  },
  { id: 4,  label: "Feed-Forward Network",     paradigm: "photonic"  },
  { id: 5,  label: "Normalization",            paradigm: "thermo"    },
  { id: 6,  label: "Residual Connections",     paradigm: "classical" },
  { id: 7,  label: "Transformer Blocks",       paradigm: "classical" },
  { id: 8,  label: "Output Projection",        paradigm: "quantum"   },
  { id: 9,  label: "Softmax / Distribution",   paradigm: "thermo"    },
  { id: 10, label: "Sampling / Decoding",      paradigm: "thermo"    },
];

// Animation timing
const SCAN_DURATION_MS = 2800;
const HOLD_MS          = 1800;
const BETWEEN_CYCLE_MS = 900;
const LAYER_STAGGER_MS = SCAN_DURATION_MS / LAYERS.length;

// Particle config per paradigm
const PARTICLE_CONFIGS = {
  quantum:   { count: 6, shape: "circle", size: 3, speed: 1.4 },
  photonic:  { count: 8, shape: "line",   size: 4, speed: 2.2 },
  thermo:    { count: 7, shape: "circle", size: 2, speed: 0.9 },
  classical: { count: 4, shape: "circle", size: 2, speed: 0.5 },
};

// ── Scan animation hook ───────────────────────────────────────────────────────

function useScanAnimation(active) {
  const [revealed, setRevealed] = useState(-1);
  const [phase, setPhase]       = useState("idle");
  const timers = useRef([]);

  useEffect(() => {
    if (!active) { setRevealed(-1); setPhase("idle"); return; }

    // Respect reduced motion preference
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPhase("idle");
      return;
    }

    function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; }

    function runCycle() {
      setPhase("scanning");
      setRevealed(-1);
      LAYERS.forEach((_, i) => {
        const t = setTimeout(() => setRevealed(i), LAYER_STAGGER_MS * i + 320);
        timers.current.push(t);
      });
      const holdT = setTimeout(() => {
        setPhase("holding");
        const restartT = setTimeout(() => { clearTimers(); runCycle(); }, HOLD_MS);
        timers.current.push(restartT);
      }, SCAN_DURATION_MS + BETWEEN_CYCLE_MS);
      timers.current.push(holdT);
    }

    const initT = setTimeout(runCycle, 400);
    timers.current.push(initT);
    return clearTimers;
  }, [active]);

  return { revealed, phase };
}

// ── Particle canvas ───────────────────────────────────────────────────────────

function ParticleField({ paradigm, width, height, seed }) {
  const canvasRef = useRef(null);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const cfg       = PARTICLE_CONFIGS[paradigm] || PARTICLE_CONFIGS.classical;
  const color     = PARADIGM_META[paradigm].color;

  useEffect(() => {

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => {
      reducedMotion.current = e.matches;
    };
    mq.addEventListener("change", handleChange);
    reducedMotion.current = mq.matches;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const rng = (n) => Math.abs(Math.sin(seed * 9301 + n * 49297 + n) % 1);
    const particles = Array.from({ length: cfg.count }, (_, i) => ({
      x:     rng(i * 3)     * width,
      y:     rng(i * 3 + 1) * height,
      vx:    (rng(i * 3 + 2) - 0.5) * cfg.speed,
      vy:    (rng(i * 7 + 1) - 0.5) * cfg.speed,
      phase: rng(i * 11)    * Math.PI * 2,
    }));

    let raf;
    function draw() {
      if (reducedMotion.current) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const t = Date.now() / 1000;
      ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 2.1);
      ctx.fillStyle = color;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width)  p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        if (cfg.shape === "line") {
          ctx.strokeStyle = color;
          ctx.lineWidth   = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 4, p.y);
          ctx.lineTo(p.x + 4, p.y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, cfg.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      mq.removeEventListener("change", handleChange);
      cancelAnimationFrame(raf);
    };
  }, [paradigm, width, height, seed, cfg, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

// ── Scanner sweep line ────────────────────────────────────────────────────────

function ScanLine({ phase }) {
  const lineRef = useRef(null);

  useEffect(() => {
    if (phase !== "scanning") return;
    const el = lineRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.top = "0%";
    void el.offsetHeight;
    el.style.transition = `top ${SCAN_DURATION_MS}ms cubic-bezier(0.4,0,0.6,1)`;
    el.style.top = "100%";
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div
      ref={lineRef}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "0%",
        height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 80%, transparent 100%)",
        zIndex: 20,
        pointerEvents: "none",
        boxShadow: "0 0 16px 6px rgba(255,255,255,0.15)",
      }}
    />
  );
}

// ── Legend strip ──────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: "flex", gap: "clamp(10px,2vw,22px)", flexWrap: "wrap" }}>
      {Object.entries(PARADIGM_META).map(([key, meta]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: meta.color,
            boxShadow: `0 0 6px ${meta.color}99`,
          }} />
          <span style={{
            fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
            fontSize: "clamp(0.6rem, 0.82vw, 0.7rem)",
            letterSpacing: "0.12em",
            color: meta.color,
            textTransform: "uppercase",
          }}>
            {meta.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Single pipeline row ───────────────────────────────────────────────────────

function LayerRow({ layer, isRevealed, rowH, particleW }) {
  const { color, label: paradigmLabel, glyph } = PARADIGM_META[layer.paradigm];

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", height: rowH }}>

      {/* Glyph badge */}
      <div style={{
        flexShrink: 0,
        width: rowH * 1.15,
        height: rowH,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
        fontWeight: 700,
        fontSize: `clamp(0.65rem, 1.1vw, 0.95rem)`,
        color: isRevealed ? color : `rgba(var(--ink), 0.18)`,
        transition: "color 380ms cubic-bezier(0.16,1,0.3,1)",
        textShadow: isRevealed ? `0 0 14px ${color}88` : "none",
      }}>
        {isRevealed ? glyph : "·"}
      </div>

      {/* Main block */}
      <div style={{
        flex: 1,
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        paddingLeft: "clamp(9px,1.4vw,16px)",
        border: `1px solid ${isRevealed ? color + "44" : "rgba(var(--ink), 0.08)"}`,
        borderLeft: `2.5px solid ${isRevealed ? color : "rgba(var(--ink), 0.14)"}`,
        background: isRevealed
          ? `linear-gradient(90deg, ${color}16 0%, ${color}07 55%, transparent 100%)`
          : "rgba(255,255,255,0.02)",
        transition: [
          "border-color 380ms cubic-bezier(0.16,1,0.3,1)",
          "border-left-color 380ms cubic-bezier(0.16,1,0.3,1)",
          "background 380ms cubic-bezier(0.16,1,0.3,1)",
          "box-shadow 380ms cubic-bezier(0.16,1,0.3,1)",
        ].join(", "),
        boxShadow: isRevealed ? `inset 0 0 0 1px rgba(var(--ink), 0.1a), 0 0 18px rgba(var(--ink), 0.1)` : "none",
        overflow: "hidden",
        borderRadius: "0 3px 3px 0",
      }}>
        {isRevealed && (
          <ParticleField
            paradigm={layer.paradigm}
            width={particleW || 200}
            height={rowH}
            seed={layer.id + 1}
          />
        )}

        <span style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "var(--font-body, 'Inter', sans-serif)",
          fontWeight: isRevealed ? 500 : 400,
          fontSize: "clamp(0.68rem, 1.05vw, 0.85rem)",
          color: isRevealed ? `rgba(var(--ink), 0.9)` : `rgba(var(--ink), 0.3)`,
          letterSpacing: "0.01em",
          transition: "color 380ms cubic-bezier(0.16,1,0.3,1)",
          whiteSpace: "nowrap",
        }}>
          {layer.label}
        </span>

        <span style={{
          position: "absolute",
          right: "clamp(8px,1.3vw,14px)",
          zIndex: 2,
          fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
          fontSize: "clamp(0.52rem, 0.78vw, 0.64rem)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: isRevealed ? color : "transparent",
          opacity: isRevealed ? 0.8 : 0,
          transition: "color 380ms cubic-bezier(0.16,1,0.3,1), opacity 380ms cubic-bezier(0.16,1,0.3,1)",
        }}>
          {paradigmLabel}
        </span>
      </div>

      {/* Row index */}
      <div style={{
        flexShrink: 0,
        width: rowH * 1.05,
        height: rowH,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
        fontSize: "clamp(0.52rem, 0.76vw, 0.62rem)",
        color: isRevealed ? color + "88" : `rgba(var(--ink), 0.14)`,
        transition: "color 380ms",
      }}>
        {String(layer.id + 1).padStart(2, "0")}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Scene5({ active }) {
  const { t } = useTranslation();
  const { revealed, phase } = useScanAnimation(active);

  // Measure container for particle canvases
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const [particleW, setParticleW] = useState(300);
  const [rowH, setRowH]           = useState(34);

  useEffect(() => {
    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setParticleW(Math.floor(width * 0.72));
        const computed = Math.max(24, Math.min(42, Math.floor((height - 20) / LAYERS.length) - 3));
        setRowH(computed);
      });
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="scene-inner">
      {/* Ambient blobs */}
      <div className="ambient-relics" aria-hidden="true">
        <span className="relic-blob" style={{ width: 260, height: 260, top: "4%",  left: "2%",  background: QUANTUM  }} />
        <span className="relic-blob" style={{ width: 200, height: 200, bottom: "6%", right: "4%", background: THERMO }} />
        <span className="relic-blob" style={{ width: 160, height: 160, top: "42%", left: "44%", background: PHOTONIC }} />
      </div>

      <div className="split">
        {/* ── Text side ──────────────────────────────────────────────────── */}
        <div className="scene-text">
          <span className="eyebrow stroke-hair">
            <span className="eyebrow-dot" style={{ background: "var(--quantum)" }} />
            QPT
          </span>

<p
              className="stroke-lg"
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
                fontWeight: 700,
                fontSize: "clamp(1.1rem, 2.4vw, 2rem)",
                lineHeight: 1.3,
                margin: "clamp(10px,1.8vw,18px) 0",
                maxWidth: "26ch",
                color: "var(--ink)",
              }}
            >
            {t(
              "scene5.statement",
              "A new era of hybrid computing — every layer runs on its optimal substrate."
            )}
          </p>

          <p className="body-line" style={{ maxWidth: "33ch", fontSize: "clamp(0.76rem,1.1vw,0.9rem)", color: "var(--ink)" }}>
            {t(
              "scene5.sub",
              "Each transformer component is assigned to the computing paradigm that best expresses its underlying mathematics — classical, quantum, photonic, or thermodynamic."
            )}
          </p>

          <div style={{ marginTop: "clamp(14px,2.2vw,24px)" }}>
            <Legend />
          </div>
        </div>

        {/* ── Diagram side ───────────────────────────────────────────────── */}
        <div className="visual-pane">
          <div
            className="instrument-frame"
            style={{ padding: "clamp(8px,1.6vw,18px) clamp(4px,0.9vw,12px)" }}
          >
            <div
              ref={containerRef}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                justifyContent: "center",
              }}
            >
              <ScanLine phase={phase} />

              {LAYERS.map((layer) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  isRevealed={layer.id <= revealed}
                  rowH={rowH}
                  particleW={particleW}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}