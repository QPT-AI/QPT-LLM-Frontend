import { useTranslation } from "react-i18next";
import "../../styles/Scene1.css";
import { PARADIGM_META } from "../../config/paradigms";

// ── Brand palette (shared with the rest of the app) ──────────────────────────
const QUANTUM  = PARADIGM_META.quantum.color;
const PHOTONIC = PARADIGM_META.photonic.color;
const THERMO   = PARADIGM_META.thermodynamic.color;

export default function Scene1() {
  const { t } = useTranslation();
  const words = t("scene1.line").split(" ");

  return (
    <div className="scene-inner">
      {/* Ambient blobs (moved from Scene 5) */}
      <div className="ambient-relics" aria-hidden="true">
        <span className="relic-blob" style={{ width: 260, height: 260, top: "4%",    left: "2%",  background: QUANTUM  }} />
        <span className="relic-blob" style={{ width: 200, height: 200, bottom: "6%", right: "4%", background: THERMO   }} />
        <span className="relic-blob" style={{ width: 160, height: 160, top: "42%",   left: "44%", background: PHOTONIC }} />
      </div>

      <div className="centered">
        <p className="hero-line stroke-lg">
          {words.map((w, i) => (
            <span
              key={i}
              className="word-fade"
              style={{ "--delay": `${180 + i * 90}ms`, marginRight: "0.28em" }}
            >
              {w}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}