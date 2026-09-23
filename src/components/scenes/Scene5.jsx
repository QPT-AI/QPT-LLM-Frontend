import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../styles/Scene5.css";
import { PARADIGM_META, hexToRgb } from "../../config/paradigms";
import { LLM_PIPELINE } from "../../config/architecture";

// ── Brand palette (shared with the rest of the app) ──────────────────────────

const QUANTUM   = PARADIGM_META.quantum.color;
const PHOTONIC  = PARADIGM_META.photonic.color;
const THERMO    = PARADIGM_META.thermodynamic.color;

// LLM pipeline with paradigm assignment — shared with the Monitor diagram.
const LAYERS = LLM_PIPELINE;

// ── Sweep timeline (one full cycle) ──────────────────────────────────────────
const INITIAL_DELAY_MS = 400;   // dark grace period before the first sweep
const SCAN_DURATION_MS = 2800;  // Tokenizer → Sampling / Decoding
const HOLD_MS          = 1600;  // all stages lit, beam parked on the last row
const FADE_OUT_MS      = 420;   // beam + rows ease back to idle
const RESTART_DELAY_MS = 480;   // dark pause before the next sweep
const CYCLE_MS         = SCAN_DURATION_MS + HOLD_MS + FADE_OUT_MS + RESTART_DELAY_MS;

const COLOR_EASE_MS = 90;       // paradigm → paradigm colour glide

// ── Layout ───────────────────────────────────────────────────────────────────
const COMPACT_BREAKPOINT = 560; // below: fixed rows + scroll-follow
const COMPACT_ROW_H      = 34;
const COMPACT_ROW_GAP    = 4;
const MIN_ROW_H          = 24;
const MAX_ROW_H          = 42;
const ROW_GAP            = 3;
const BEAM_H             = 2;   // scan-line core thickness
const TRAIL_H            = 44;  // afterglow trailing above the beam

// ── Particle config per paradigm ─────────────────────────────────────────────
const PARTICLE_CONFIGS = {
  quantum:       { count: 6, shape: "circle", size: 3, speed: 1.4 },
  photonic:      { count: 8, shape: "line",   size: 4, speed: 2.2 },
  thermodynamic: { count: 7, shape: "circle", size: 2, speed: 0.9 },
  classical:     { count: 4, shape: "circle", size: 2, speed: 0.5 },
};

// ── Small utils ──────────────────────────────────────────────────────────────
const clamp      = (v, min, max) => Math.max(min, Math.min(max, v));
const smoothstep = (t) => t * t * (3 - 2 * t);

const PARADIGM_RGB = Object.fromEntries(
  Object.entries(PARADIGM_META).map(([k, m]) => [k, hexToRgb(m.color)])
);

const rgba = (c, a) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;

const lerpRgb = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// Paradigm colour under a given y — blends across the gap between two rows.
function paradigmColorAtY(y, metrics) {
  if (!metrics.length) return PARADIGM_RGB.classical;
  const first = metrics[0];
  const last  = metrics[metrics.length - 1];
  if (y <= first.top) return PARADIGM_RGB[first.paradigm];
  if (y >= last.top + last.height) return PARADIGM_RGB[last.paradigm];
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i];
    if (y >= m.top && y < m.top + m.height) return PARADIGM_RGB[m.paradigm];
  }
  for (let i = 0; i < metrics.length - 1; i++) {
    const a = metrics[i];
    const b = metrics[i + 1];
    const aEnd = a.top + a.height;
    if (y >= aEnd && y < b.top) {
      const t = (y - aEnd) / Math.max(1, b.top - aEnd);
      return lerpRgb(PARADIGM_RGB[a.paradigm], PARADIGM_RGB[b.paradigm], t);
    }
  }
  return PARADIGM_RGB[last.paradigm];
}

// ── Motion preference (live-updating) ────────────────────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setReduced(e.matches);
    setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// ── Sweep engine ─────────────────────────────────────────────────────────────
// One rAF clock drives the beam, the row reveals, the paradigm colour and the
// status readout. Reveals are *derived from the beam position* (a row flips the
// moment the beam crosses its vertical centre), so they can never drift.
// Per-frame visuals are written imperatively (transform/opacity) — React only
// re-renders when a row flips or the phase changes (~15 times per cycle).

function useScanAnimation({ active, containerRef, rowRefs, compact }) {
  const [revealed, setRevealed] = useState(-1);    // highest revealed layer index
  const [phase, setPhase]       = useState("idle"); // idle|waiting|scanning|holding|fading
  const beamRef   = useRef(null);
  const trailRef  = useRef(null);
  const metricsRef = useRef([]);                   // measured row geometry
  const compactRef = useRef(compact);
  const reduced = usePrefersReducedMotion();

  useEffect(() => { compactRef.current = compact; }, [compact]);

  // Real geometry of the rendered rows (offsets already include the gaps).
  const measure = useCallback(() => {
    const els = rowRefs.current;
    if (els.length !== LAYERS.length || els.some((el) => !el)) return;
    metricsRef.current = els.map((el, i) => ({
      top:       el.offsetTop,
      height:    el.offsetHeight,
      paradigm:  LAYERS[i].paradigm,
    }));
  }, [rowRefs]);

  // Keep geometry fresh: resize, font swap, compact switch, row re-sizing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === "undefined") {
      const onResize = () => measure();
      window.addEventListener("resize", onResize, { passive: true });
      return () => window.removeEventListener("resize", onResize);
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, measure]);

  // The sweep loop.
  useEffect(() => {
    const hideBeam = () => {
      const b = beamRef.current;
      if (b) b.style.opacity = "0";
    };

    if (!active) {
      setPhase("idle");
      setRevealed(-1);
      hideBeam();
      return;
    }

    if (reduced) {
      // Static, fully-revealed pipeline — no motion at all.
      setPhase("idle");
      setRevealed(LAYERS.length - 1);
      hideBeam();
      return;
    }

    const container = containerRef.current;
    let raf = 0;
    let running = true;
    let cycleStart = null;
    let lastNow = 0;
    let currentColor = PARADIGM_RGB[LAYERS[0].paradigm].slice();
    let colorSnapped = false;
    let userScrolled = false;   // user owns the scroll until the next cycle
    let lastReveal = -2;
    let lastPhase  = "";

    const markUserScroll = () => { userScrolled = true; };
    const scrollEvents = ["pointerdown", "wheel", "touchstart"];
    scrollEvents.forEach((ev) =>
      container?.addEventListener(ev, markUserScroll, { passive: true })
    );

    const frame = (now) => {
      if (!running) return;

      if (cycleStart === null) { cycleStart = now + INITIAL_DELAY_MS; lastNow = now; }
      const dt = clamp(now - lastNow, 0, 64);
      lastNow = now;

      let metrics = metricsRef.current;
      if (metrics.length !== LAYERS.length) { measure(); metrics = metricsRef.current; }

      if (metrics.length === LAYERS.length) {
        let t = now - cycleStart;

        if (t >= CYCLE_MS) {
          // New cycle: re-read geometry (fonts/layout may have shifted).
          cycleStart = now;
          t = 0;
          userScrolled = false;
          colorSnapped = false;
          measure();
          metrics = metricsRef.current;
        }

        // Beam path = exactly the layer stack: top of row 0 → bottom of last row.
        const firstTop    = metrics[0].top;
        const lastBottom  = metrics[metrics.length - 1].top + metrics[metrics.length - 1].height;
        const span        = Math.max(1, lastBottom - firstTop);

        let y = firstTop;
        let opacity = 0;
        let revealCount = 0;
        let phaseNow = "waiting";

        if (t < 0) {
          // Pre-sweep grace period — dark.
        } else if (t < SCAN_DURATION_MS) {
          phaseNow = "scanning";
          y = firstTop + smoothstep(t / SCAN_DURATION_MS) * span;
          opacity = Math.min(1, t / 160);
          // A row reveals the instant the beam crosses its centre.
          for (let i = 0; i < metrics.length; i++) {
            if (y >= metrics[i].top + metrics[i].height / 2) revealCount = i + 1;
          }
        } else if (t < SCAN_DURATION_MS + HOLD_MS) {
          phaseNow = "holding";
          y = lastBottom;
          opacity = 0.4;
          revealCount = metrics.length;
        } else if (t < SCAN_DURATION_MS + HOLD_MS + FADE_OUT_MS) {
          phaseNow = "fading";
          y = lastBottom;
          opacity = 0.4 * (1 - (t - SCAN_DURATION_MS - HOLD_MS) / FADE_OUT_MS);
        }
        // else: "waiting" — dark pause before the next sweep (defaults cover it).

        // Discrete React state — only when it actually changes.
        if (revealCount - 1 !== lastReveal) { lastReveal = revealCount - 1; setRevealed(lastReveal); }
        if (phaseNow !== lastPhase)         { lastPhase = phaseNow; setPhase(phaseNow); }

        // Paradigm colour under the beam, eased between stages
        // (frame-rate independent exponential smoothing).
        const target = paradigmColorAtY(y, metrics);
        if (!colorSnapped) { currentColor = target.slice(); colorSnapped = true; }
        else currentColor = lerpRgb(currentColor, target, 1 - Math.exp(-dt / COLOR_EASE_MS));

        // Paint the beam imperatively — compositor-friendly, zero re-renders.
        const beam = beamRef.current;
        if (beam) {
          beam.style.transform = `translate3d(0, ${(y - BEAM_H / 2).toFixed(1)}px, 0)`;
          beam.style.opacity = opacity.toFixed(3);
          beam.style.background =
            `linear-gradient(90deg, transparent 0%, ${rgba(currentColor, 0.12)} 14%, ${rgba(currentColor, 0.95)} 50%, ${rgba(currentColor, 0.12)} 86%, transparent 100%)`;
          // Glow reads on dark themes; the faint dark micro-shadow (last value)
          // only matters on light themes — no theme detection needed.
          beam.style.boxShadow =
            `0 0 12px 2px ${rgba(currentColor, 0.32)}, 0 0 3px 1px ${rgba(currentColor, 0.6)}, 0 1px 3px rgba(0, 0, 0, 0.2)`;
        }
        const trail = trailRef.current;
        if (trail) {
          trail.style.background =
            `linear-gradient(180deg, transparent 0%, ${rgba(currentColor, 0.09)} 100%)`;
        }

        // Compact mode: the scroller follows the beam; user touch/wheel
        // takes over the scroll until the next cycle begins.
        if (container && compactRef.current) {
          const maxScroll = container.scrollHeight - container.clientHeight;
          if (maxScroll > 2 && !userScrolled) {
            if (phaseNow === "scanning" || phaseNow === "holding") {
              const targetScroll = clamp(y - container.clientHeight * 0.42, 0, maxScroll);
              container.scrollTop += (targetScroll - container.scrollTop) * (1 - Math.exp(-dt / 140));
            } else {
              container.scrollTop *= Math.exp(-dt / 160);
              if (container.scrollTop < 0.5) container.scrollTop = 0;
            }
          }
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      scrollEvents.forEach((ev) =>
        container?.removeEventListener(ev, markUserScroll)
      );
    };
  }, [active, reduced, containerRef, measure]);

  return { revealed, phase, beamRef, trailRef };
}

// ── Scan beam (purely imperative target — driven by the engine above) ────────
// Lives INSIDE the scrollable layer stack, so in compact mode it scrolls
// with the rows and is followed by the auto-scroll.

function ScanLine({ beamRef, trailRef }) {
  return (
    <div
      ref={beamRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: BEAM_H,
        opacity: 0,
        transform: "translate3d(0, -6px, 0)",
        zIndex: 20,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
    >
      {/* Afterglow trailing above the beam */}
      <div
        ref={trailRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "100%",
          height: TRAIL_H,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── Instrument status strip (always in sync with the beam) ───────────────────

function StatusStrip({ phase, revealed }) {
  const { t } = useTranslation();
  const total   = LAYERS.length;
  const current = revealed >= 0 && revealed < total ? LAYERS[revealed] : null;
  const meta    = current ? PARADIGM_META[current.paradigm] : null;
  const nn      = String(clamp(revealed + 1, 1, total)).padStart(2, "0");
  const showChip = meta && (phase === "scanning" || phase === "holding");

  const status =
    phase === "scanning" ? `${t("scene5.status.sweep", "SWEEP")} ${nn}/${String(total).padStart(2, "0")}`
    : phase === "holding" ? t("scene5.status.complete", "SWEEP COMPLETE")
    : phase === "fading"  ? t("scene5.status.reset", "RESET")
    : t("scene5.status.standby", "PIPELINE STANDBY");

  return (
    <div style={{
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "0 clamp(2px, 0.6vw, 6px) clamp(5px, 0.8vw, 8px)",
      borderBottom: "1px solid rgba(var(--ink), 0.10)",
      fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
      fontSize: "clamp(0.54rem, 0.8vw, 0.66rem)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "rgba(var(--ink), 0.55)",
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <span
          className={phase === "scanning" ? "scene5-pulse" : undefined}
          style={{
            width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
            background: meta ? meta.color : "rgba(var(--ink), 0.4)",
            boxShadow: meta ? `0 0 6px ${meta.color}88` : "none",
          }}
        />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{status}</span>
      </span>

      {showChip ? (
        <span style={{
          display: "flex", alignItems: "center", gap: 6,
          color: meta.color, opacity: 0.85, flexShrink: 0,
        }}>
          <span style={{
            width: 4, height: 4, borderRadius: "50%",
            background: meta.color, boxShadow: `0 0 6px ${meta.color}80`,
          }} />
          {t(`paradigms.${current.paradigm}`, meta.label)}
        </span>
      ) : (
        <span style={{ flexShrink: 0, opacity: 0.7 }}>
          {String(total).padStart(2, "0")} {t("scene5.status.stages", "STAGES")}
        </span>
      )}
    </div>
  );
}

// ── Particle canvas ──────────────────────────────────────────────────────────

function ParticleField({ paradigm, width, height, seed }) {
  const canvasRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const cfg   = PARTICLE_CONFIGS[paradigm] || PARTICLE_CONFIGS.classical;
  const color = PARADIGM_META[paradigm].color;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.max(1, Math.floor(width  * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rng = (n) => Math.abs(Math.sin(seed * 9301 + n * 49297 + n) % 1);
    const particles = Array.from({ length: cfg.count }, (_, i) => ({
      x:  rng(i * 3)     * width,
      y:  rng(i * 3 + 1) * height,
      vx: (rng(i * 3 + 2) - 0.5) * cfg.speed,
      vy: (rng(i * 7 + 1) - 0.5) * cfg.speed,
    }));

    const drawParticle = (p, alpha) => {
      ctx.globalAlpha = alpha;
      if (cfg.shape === "line") {
        // Photonic streaks point along their direction of travel.
        const ang = Math.atan2(p.vy, p.vx);
        const len = cfg.size;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
        ctx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cfg.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Reduced motion: one static frame, no loop.
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => drawParticle(p, 0.2 + 0.08 * (i % 3)));
      ctx.globalAlpha = 1;
      return;
    }

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const t = Date.now() / 1000;
      const alpha = clamp(0.25 + 0.35 * Math.sin(t * 2.1), 0.08, 0.6);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width)  { p.vx *= -1; p.x = clamp(p.x, 0, width); }
        if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = clamp(p.y, 0, height); }
        drawParticle(p, alpha);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [paradigm, width, height, seed, cfg, color, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none" }}
    />
  );
}

// ── Legend strip ──────────────────────────────────────────────────────────────

function Legend() {
  const { t } = useTranslation();
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
            {t(`paradigms.${key}`, meta.label)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Single pipeline row ───────────────────────────────────────────────────────

function LayerRow({ layer, isRevealed, rowH, particleW, compact, rowRef }) {
  const { color, glyph } = PARADIGM_META[layer.paradigm];

  return (
    <div
      ref={rowRef}
      role="listitem"
      className="scene5-row"
      style={{ position: "relative", display: "flex", alignItems: "center", height: rowH, flexShrink: 0 }}
    >
      {/* Glyph badge — flush left, vertically centered, never clipped */}
      <div style={{
        flexShrink: 0,
        width: compact ? rowH : rowH * 1.15,
        height: rowH,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
        fontWeight: 700,
        fontSize: `clamp(0.6rem, 1.1vw, 0.95rem)`,
        color: isRevealed ? color : `rgba(var(--ink), 0.18)`,
        transition: "color 380ms cubic-bezier(0.16,1,0.3,1)",
        textShadow: isRevealed ? `0 0 14px ${color}88` : "none",
      }}>
        {isRevealed ? glyph : "·"}
      </div>

      {/* Main block */}
      <div style={{
        flex: 1,
        minWidth: 0,
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        paddingLeft: "clamp(8px,1.4vw,16px)",
        border: `1px solid ${isRevealed ? color + "44" : "rgba(var(--ink), 0.08)"}`,
        borderLeft: `2.5px solid ${isRevealed ? color : "rgba(var(--ink), 0.14)"}`,
        background: isRevealed
          ? `linear-gradient(90deg, ${color}16 0%, ${color}07 55%, transparent 100%)`
          : "rgba(255,255,255,0.02)",
        transition: [
          "border-color 380ms cubic-bezier(0.16,1,0.3,1)",
          "border-left-color 380ms cubic-bezier(0.16,1,0.3,1)",
          "background 380ms cubic-bezier(0.16,1,0.3,1)",
        ].join(", "),
        overflow: "hidden",
        borderRadius: "0 3px 3px 0",
      }}>
        {isRevealed && !compact && (
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
          fontSize: "clamp(0.62rem, 1.05vw, 0.85rem)",
          color: isRevealed ? `rgba(var(--ink), 0.9)` : `rgba(var(--ink), 0.3)`,
          letterSpacing: "0.01em",
          transition: "color 380ms cubic-bezier(0.16,1,0.3,1)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: compact ? 8 : 70,
        }}>
          {layer.label}
        </span>

        {/* Paradigm tag — hidden on phones */}
        {!compact && (
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
            <ParadigmTag paradigm={layer.paradigm} />
          </span>
        )}
      </div>

      {/* Row index — hidden on phones */}
      {!compact && (
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
      )}
    </div>
  );
}

// Small helper so paradigm tags translate too
function ParadigmTag({ paradigm }) {
  const { t } = useTranslation();
  return <>{t(`paradigms.${paradigm}`, PARADIGM_META[paradigm].label)}</>;
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Scene5({ active }) {
  const { t } = useTranslation();

  const containerRef = useRef(null);
  const rowRefs      = useRef([]);   // filled by LayerRow ref callbacks

  const [particleW, setParticleW] = useState(300);
  const [rowH, setRowH]           = useState(34);
  const [compact, setCompact]     = useState(false);

  const { revealed, phase, beamRef, trailRef } = useScanAnimation({
    active,
    containerRef,
    rowRefs,
    compact,
  });

  // Responsive sizing via ResizeObserver (container-driven, not window-driven).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measurePane = () => {
      const { width, height } = el.getBoundingClientRect();
      const isCompact = width < COMPACT_BREAKPOINT;
      setCompact(isCompact);
      setParticleW(Math.max(80, Math.floor(width * 0.72)));
      // Compact: fixed comfortable row height — the container scrolls.
      // Desktop: fit rows to the available height.
      setRowH(
        isCompact
          ? COMPACT_ROW_H
          : clamp(
              Math.floor((height - 12) / LAYERS.length) - ROW_GAP,
              MIN_ROW_H,
              MAX_ROW_H
            )
      );
    };

    measurePane();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measurePane);
      ro.observe(el);
      return () => ro.disconnect();
    }
    const onResize = () => measurePane();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="scene-inner">
      <style>{`
        .scene5-scroll { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .scene5-scroll::-webkit-scrollbar { display: none; }
        @keyframes scene5-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
        .scene5-pulse { animation: scene5-pulse 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .scene5-pulse { animation: none; }
          .scene5-row, .scene5-row * { transition: none !important; }
        }
      `}</style>

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
            {t("scene5.statement", "QPT — the first language model to combine the best of three types of computing to achieve greater efficiency and lower cost.")}
          </p>

          <p className="body-line" style={{ maxWidth: "33ch", fontSize: "clamp(0.76rem,1.1vw,0.9rem)", color: "var(--ink)" }}>
            {t("scene5.detail", "Each transformer component is assigned to the computing paradigm that best expresses its underlying mathematics — classical, quantum, photonic, or thermodynamic.")}
          </p>

          <div style={{ marginTop: "clamp(14px,2.2vw,24px)" }}>
            <Legend />
          </div>
        </div>

        {/* ── Diagram side ───────────────────────────────────────────────── */}
        <div className="visual-pane" style={{ minWidth: 0 }}>
          <div
            className="instrument-frame"
            style={{
              padding: "clamp(8px,1.6vw,18px) clamp(4px,0.9vw,12px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <StatusStrip phase={phase} revealed={revealed} />

            <div
              ref={containerRef}
              role="list"
              aria-label={t("scene5.aria.pipeline", "Model pipeline stages")}
              className={compact ? "scene5-scroll" : undefined}
              style={{
                position: "relative",
                flex: "1 1 auto",
                minHeight: 300,
                display: "flex",
                flexDirection: "column",
                gap: compact ? COMPACT_ROW_GAP : ROW_GAP,
                justifyContent: compact ? "flex-start" : "center",
                marginTop: "clamp(4px, 0.8vw, 8px)",
                overflowY: compact ? "auto" : "hidden",
                overflowX: "hidden",
                paddingRight: compact ? 2 : 0,
              }}
            >
              {LAYERS.map((layer, i) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  isRevealed={layer.id <= revealed}
                  rowH={rowH}
                  particleW={particleW}
                  compact={compact}
                  rowRef={(el) => { rowRefs.current[i] = el; }}
                />
              ))}

              {/* Scan beam — inside the layer stack, scrolls with it */}
              <ScanLine beamRef={beamRef} trailRef={trailRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}