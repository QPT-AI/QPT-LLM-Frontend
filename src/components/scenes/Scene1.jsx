import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function useVoidField(count = 46) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 3 + Math.random() * 5,
        delay: Math.random() * 5,
      })),
    [count]
  );
}

export default function Scene1() {
  const { t } = useTranslation();
  const dots = useVoidField();
  const words = t("scene1.line").split(" ");

  return (
    <div className="scene-inner">
      <div className="void-field" aria-hidden="true">
        {dots.map((d) => (
          <span
            key={d.id}
            className="void-dot"
            style={{
              top: `${d.top}%`,
              left: `${d.left}%`,
              width: d.size,
              height: d.size,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="centered">
        <span className="eyebrow stroke-hair">
          <span className="eyebrow-dot" style={{ background: "var(--quantum)" }} />
          QPT — beyond electricity
        </span>
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
