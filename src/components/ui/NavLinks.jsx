import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NavLinks() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav-links" aria-label={t("nav.sectionLabel")}>
      <Link to="/" className="app-nav-link">
        {t("nav.home")}
      </Link>
      <Link to="/panel" className="app-nav-link">
        {t("nav.panel", "Panel")}
      </Link>
      <Link to="/chat" className="app-nav-link">
        {t("nav.chat")}
      </Link>
      <Link to="/monitor" className="app-nav-link">
        {t("nav.monitor")}
      </Link>
    </nav>
  );
}
