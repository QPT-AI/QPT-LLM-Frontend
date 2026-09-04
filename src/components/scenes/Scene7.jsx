import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-/=?";

export default function Scene7({ active }) {
  const { t } = useTranslation();
  const finalText = t("scene7.final");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!active) {
      setDisplay("");
      return undefined;
    }

    // In reduced motion mode, show the final text instantly
    if (reducedMotion) {
      setDisplay(finalText);
      return undefined;
    }

    const order = Array.from({ length: finalText.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const locked = new Set();
    let cursor = 0;
    const batchSize = Math.max(1, Math.floor(finalText.length / 42));

    const render = () => {
      let out = "";
      for (let i = 0; i < finalText.length; i++) {
        const ch = finalText[i];
        if (ch === " " || locked.has(i)) {
          out += ch;
        } else {
          out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
        }
      }
      setDisplay(out);
    };

    render();
    const flicker = setInterval(render, 60);
    const locker = setInterval(() => {
      if (cursor >= order.length) {
        clearInterval(locker);
        clearInterval(flicker);
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

  return (
    <div className="scene-inner">
      <div className="centered">

        <p className="glitch-text stroke-sm" aria-live="off">
          {display}
        </p>
      </div>
    </div>
  );
}
