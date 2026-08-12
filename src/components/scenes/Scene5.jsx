import { useTranslation } from "react-i18next";

export default function Scene5() {
  const { t } = useTranslation();

  return (
    <div className="scene-inner">
      <div className="ambient-relics" aria-hidden="true">
        <span className="relic-blob" style={{ width: 320, height: 320, top: "8%", left: "6%", background: "#5bad1e" }} />
        <span className="relic-blob" style={{ width: 260, height: 260, bottom: "6%", right: "8%", background: "#e8690a" }} />
        <svg className="relic-wave" width="70%" height="200" style={{ top: "50%", left: "15%", marginTop: -100 }} viewBox="0 0 700 200">
          <path
            d="M0,100 C 80,20 160,180 240,100 C 320,20 400,180 480,100 C 560,20 640,180 700,100"
            fill="none"
            stroke="#f0ab00"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="centered">
        <div className="intro-card">
          <span className="eyebrow stroke-hair">
            <span className="eyebrow-dot" style={{ background: "var(--quantum)" }} />
            QPT
          </span>
          <p className="intro-statement stroke-lg">{t("scene5.statement")}</p>
        </div>
      </div>
    </div>
  );
}
