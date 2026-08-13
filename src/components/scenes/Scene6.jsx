import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Scene6({ active }) {
  const { t } = useTranslation();

  // Resolve the translated string on every render so length is always correct
  const generatedText = t("scene6.generatedText");

  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active) {
      setRevealed(0);
      return undefined;
    }
    setRevealed(0);
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
  }, [active, generatedText]); // ← generatedText in deps so language switches restart the animation

  const done = revealed >= generatedText.length;

  return (
    <div className="scene-inner">
      <div className="centered">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(1.12rem, 2.4vw, 1.4rem)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#e7e9e6",
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