import { useTranslation } from "react-i18next";
import EmailCapture from "../ui/EmailCapture";
import "../../styles/Scene8.css";

export default function Scene8() {
  const { t } = useTranslation();
  return (
    <div className="scene-inner">
      <div className="future-wrap">
        <p className="future-statement stroke-lg" style={{ marginTop: 18 }}>
          {t("scene8.prefix")}
          <span className="future-term" style={{ color: "var(--ternary)" }}>
            {t("scene8.ternary")}
          </span>
          {t("scene8.middle")}
          <span className="future-term" style={{ color: "var(--bio)" }}>
            {t("scene8.bio")}
          </span>
          {t("scene8.suffix")}
        </p>
        <footer className="footer-strip">
          <span className="footer-thanks stroke-hair">{t("footer.thanks")}</span>
          <div className="footer-actions">
            <EmailCapture />
            <button type="button" className="footer-btn primary">
              {t("footer.supportUs")}
            </button>
          </div>
          <span className="footer-copyright">{t("footer.copyright")}</span>
        </footer>
      </div>
    </div>
  );
}