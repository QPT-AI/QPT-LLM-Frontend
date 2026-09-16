import { useTranslation } from "react-i18next";
import "../../styles/Scene1.css";

export default function Scene1() {
  const { t } = useTranslation();
  const words = t("scene1.line").split(" ");

  return (
    <div className="scene-inner">
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