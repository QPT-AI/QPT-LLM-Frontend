import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import "../../styles/Scene7.css";
import { PARADIGM_META } from "../../config/paradigms";

// ── Brand palette (shared with the rest of the app) ──────────────────────────
const QUANTUM  = PARADIGM_META.quantum.color;
const PHOTONIC = PARADIGM_META.photonic.color;
const THERMO   = PARADIGM_META.thermodynamic.color;

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-/=?";

/* ---------- tuning ---------- */
const MIN_FONT = 10;          // never smaller than this (px)
const MAX_FONT_RATIO = 0.08;  // upper bound: 8% of the scene width
const MAX_FONT_CAP = 96;      // hard cap (px)
const LINE_HEIGHT = 1.2;
const FIT_STEPS = 42;         // lock steps → ~2.5 s in EVERY language
const HEIGHT_SAFETY = 0.95;   // breathing room

export default function Scene7({ active }) {
  const { t } = useTranslation();
  const finalText = t("scene7.final") || "";

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [display, setDisplay] = useState("");
  const [fontSize, setFontSize] = useState(null);

  const areaRef = useRef(null);   // the box the text must fit into
  const textRef = useRef(null);   // the visible <p>
  const probeRef = useRef(null);  // hidden clone, used only for measuring

  /* ------------------------------------------------------------------
   * Auto-fit: binary-search the largest font-size at which the FINAL
   * text, in the CURRENT language, fits inside the scene (wrapping to
   * more lines when needed). Re-runs on resize, language change,
   * and after webfonts load.
   * ------------------------------------------------------------------ */
  const fitText = useCallback(() => {
    const area = areaRef.current;
    const text = textRef.current;
    const probe = probeRef.current;
    if (!area || !text || !probe || !finalText) return;

    // width: from the <p>'s real parent (respects max-width etc.)
    const widthBox = text.parentElement || area;
    const wcs = getComputedStyle(widthBox);
    const availW =
      widthBox.clientWidth -
      parseFloat(wcs.paddingLeft) - parseFloat(wcs.paddingRight);

    // height: from the scene box itself
    const acs = getComputedStyle(area);
    const availH =
      (area.clientHeight -
        parseFloat(acs.paddingTop) - parseFloat(acs.paddingBottom)) *
      HEIGHT_SAFETY;

    if (availW <= 0 || availH <= 0) return; // scene hidden / not laid out

    // make the probe wrap exactly like the real <p> will
    probe.style.width = `${Math.floor(availW)}px`;

    const max = Math.max(MIN_FONT, Math.min(availW * MAX_FONT_RATIO, MAX_FONT_CAP));
    let lo = MIN_FONT;
    let hi = max;
    let best = MIN_FONT;

    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      probe.style.fontSize = `${mid}px`;
      if (probe.scrollHeight <= availH) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }

    setFontSize(best);
  }, [finalText]);

  useLayoutEffect(() => {
    fitText();
    // webfont metrics arrive late – re-fit once they're ready
    document.fonts?.ready?.then(() => fitText()).catch(() => {});
  }, [fitText, active]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => fitText());
    ro.observe(area);
    return () => ro.disconnect();
  }, [fitText]);

  /* ------------------------- scramble ------------------------- */
  useEffect(() => {
    if (!active) {
      setDisplay("");
      return undefined;
    }
    if (reducedMotion) {
      setDisplay(finalText);
      return undefined;
    }

    // work on code points so emoji / non-latin scripts survive
    const chars = Array.from(finalText);
    // only positions with a visible character get scrambled
    const order = chars.map((_, i) => i).filter((i) => !/\s/.test(chars[i]));

    if (order.length === 0) {
      setDisplay(finalText);
      return undefined;
    }

    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const locked = new Set();
    let cursor = 0;
    // ~42 lock steps → same duration in every language, regardless of length
    const batchSize = Math.max(1, Math.round(order.length / FIT_STEPS));

    const render = () => {
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        out +=
          /\s/.test(ch) || locked.has(i)
            ? ch
            : CHARSET[Math.floor(Math.random() * CHARSET.length)];
      }
      setDisplay(out);
    };

    render();
    const flicker = setInterval(render, 60);
    const locker = setInterval(() => {
      if (cursor >= order.length) {
        clearInterval(flicker);
        clearInterval(locker);
        setDisplay(finalText);
        return;
      }
      for (let b = 0; b < batchSize && cursor < order.length; b++, cursor++) {
        locked.add(order[cursor]);
      }
    }, 60);

    return () => {
      clearInterval(flicker);
      clearInterval(locker);
    };
  }, [active, finalText, reducedMotion]);

  const textStyle = {
    fontSize: fontSize ? `${fontSize}px` : undefined,
    lineHeight: LINE_HEIGHT,
    whiteSpace: "pre-wrap",   // wrap into lines, keep real spaces / \n
    overflowWrap: "anywhere", // break very long words (long Russian words!)
    textAlign: "center",
    margin: 0,
  };

  return (
    <div className="scene-inner" ref={areaRef}>
      {/* Ambient blobs */}
      <div className="ambient-relics" aria-hidden="true">
        <span className="relic-blob" style={{ width: 260, height: 260, top: "4%",    left: "2%",  background: QUANTUM  }} />
        <span className="relic-blob" style={{ width: 200, height: 200, bottom: "6%", right: "4%", background: THERMO   }} />
        <span className="relic-blob" style={{ width: 160, height: 160, top: "42%",   left: "44%", background: PHOTONIC }} />
      </div>

      <div className="centered">
        <p
          ref={textRef}
          className="glitch-text stroke-sm"
          style={textStyle}
          aria-hidden="true" /* the flicker is decoration… */
        >
          {display}
        </p>
        {/* …the real sentence is what screen readers get instead */}
        {active && <span className="sr-only">{finalText}</span>}
      </div>

      {/* invisible clone of the final text – measuring only */}
      <span
        ref={probeRef}
        aria-hidden="true"
        className="glitch-text stroke-sm"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          display: "block",
          visibility: "hidden",
          pointerEvents: "none",
          lineHeight: LINE_HEIGHT,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          textAlign: "center",
          margin: 0,
        }}
      >
        {finalText}
      </span>
    </div>
  );
}