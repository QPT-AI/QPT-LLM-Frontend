import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import EmailCapture from "../ui/EmailCapture";
import "../../styles/Scene8.css";
import { PARADIGM_META } from "../../config/paradigms";
import { lazyWithReload } from "../../utils/lazyWithReload";

// QR code + icons load only once someone opens the dialog.
const SupportDialog = lazyWithReload(() => import("../ui/SupportDialog"));

// ── Brand palette (shared with the rest of the app) ──────────────────────────
const QUANTUM  = PARADIGM_META.quantum.color;
const PHOTONIC = PARADIGM_META.photonic.color;
const THERMO   = PARADIGM_META.thermodynamic.color;

export default function Scene8() {
  const { t } = useTranslation();
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportLoaded, setSupportLoaded] = useState(false);
  const openSupport = () => {
    setSupportLoaded(true);
    setSupportOpen(true);
  };
  return (
    <div className="scene-inner">
      {/* Ambient blobs */}
      <div className="ambient-relics" aria-hidden="true">
        <span className="relic-blob" style={{ width: 260, height: 260, top: "4%",    left: "2%",  background: QUANTUM  }} />
        <span className="relic-blob" style={{ width: 200, height: 200, bottom: "6%", right: "4%", background: THERMO   }} />
        <span className="relic-blob" style={{ width: 160, height: 160, top: "42%",   left: "44%", background: PHOTONIC }} />
      </div>

      <div className="future-wrap">
        <p className="future-statement stroke-lg" style={{ marginTop: 18 }}>
          {t("scene8.prefix")}
          <span className="future-term" style={{ color: "var(--ternary)" }}>
            {t("scene8.ternary")}
          </span>
          {t("scene8.sep")}
          <span className="future-term" style={{ color: "var(--ternary)" }}>
            {t("scene8.neuromorphic")}
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
            <Link to="/our-team" className="footer-btn ghost">
              {t("footer.ourTeam")}
            </Link>
            <button type="button" className="footer-btn primary" onClick={openSupport} onPointerEnter={() => SupportDialog.preload()}>
              {t("footer.supportUs")}
            </button>
          </div>
          <span className="footer-copyright">{t("footer.copyright")}</span>
        </footer>
        {supportLoaded && (
          <Suspense fallback={null}>
            <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}