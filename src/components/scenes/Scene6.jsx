import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../styles/Scene6.css";
import { PARADIGM_META } from "../../config/paradigms";

// ── Brand palette (shared with the rest of the app) ──────────────────────────
const QUANTUM  = PARADIGM_META.quantum.color;
const PHOTONIC = PARADIGM_META.photonic.color;
const THERMO   = PARADIGM_META.thermodynamic.color;

export default function Scene6({ active }) {
  const { t } = useTranslation();

  // Respect reduced motion preference
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Resolve the translated string on every render so length is always correct
  const generatedText = t("scene6.generatedText");

  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active) {
      setRevealed(0);
      return undefined;
    }
    setRevealed(0);
    // In reduced motion mode, show the text instantly
    if (reducedMotion) {
      setRevealed(generatedText.length);
      return undefined;
    }
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= generatedText.length) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 44);
    return () => clearInterval(id);
  }, [active, generatedText, reducedMotion]); // ← generatedText in deps so language switches restart the animation

  const done = revealed >= generatedText.length;

  return (
    <div className="scene-inner">
      {/* Ambient blobs */}
      <div className="ambient-relics" aria-hidden="true">
        <span className="relic-blob" style={{ width: 260, height: 260, top: "4%",    left: "2%",  background: QUANTUM  }} />
        <span className="relic-blob" style={{ width: 200, height: 200, bottom: "6%", right: "4%", background: THERMO   }} />
        <span className="relic-blob" style={{ width: 160, height: 160, top: "42%",   left: "44%", background: PHOTONIC }} />
      </div>

      <div className="centered">
        <p
          className="scene6-text"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(1.12rem, 2.4vw, 1.4rem)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--ink)",
            margin: 0,
          }}
        >
          {generatedText.slice(0, revealed)}
          <span
            style={{
              color: "var(--photonic)",
              animation: "cursorBlink 1s steps(1) infinite",
            }}
          >
            {done ? "▌" : "|"}
          </span>
        </p>
      </div>
    </div>
  );
}