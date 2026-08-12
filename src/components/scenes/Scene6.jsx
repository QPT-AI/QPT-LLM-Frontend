import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const GENERATED_TEXT =
  "Today you think this is bullshit; in 15 years you will realize that this idea will reach the world. " +
  "This is the moment to prepare before the hardware boom explodes — by making artificial intelligence more efficient across combined forms of computing.";

export default function Scene6({ active }) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active) {
      setRevealed(0);
      return undefined;
    }
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= GENERATED_TEXT.length) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 22);
    return () => clearInterval(id);
  }, [active]);

  const done = revealed >= GENERATED_TEXT.length;

  return (
    <div className="scene-inner">
      <div className="centered">
        <span className="eyebrow stroke-hair">
          <span className="eyebrow-dot" style={{ background: "var(--quantum)" }} />
          {t("scene6.eyebrow")}
        </span>

        <div className="terminal-window">
          <div className="terminal-bar">
            <span className="terminal-dot" style={{ background: "#ff5f56" }} />
            <span className="terminal-dot" style={{ background: "#ffbd2e" }} />
            <span className="terminal-dot" style={{ background: "#27c93f" }} />
            <span className="terminal-label">qpt · generation</span>
          </div>
          <pre className="terminal-body">
            <span className="terminal-prompt">{"> "}</span>
            {GENERATED_TEXT.slice(0, revealed)}
            <span className="terminal-cursor">{done ? "▌" : "|"}</span>
          </pre>
        </div>
      </div>
    </div>
  );
}
