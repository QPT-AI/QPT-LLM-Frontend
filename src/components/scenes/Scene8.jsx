import { useTranslation } from "react-i18next";

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
            <button type="button" className="footer-btn ghost">
              {t("footer.stayInformed")}
            </button>
            <button type="button" className="footer-btn primary">
              {t("footer.supportUs")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
