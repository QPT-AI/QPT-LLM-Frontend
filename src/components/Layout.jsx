import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import LoginButton from "../components/ui/LoginButton";

export default function Layout({ children }) {
  const { t } = useTranslation();

  return (
    <div className="app-shell">
      <header className="chrome chrome-top app-nav">
        <Link to="/" className="wordmark stroke-hair brand-mark" aria-label="QPT home">
          <img src="/favicon.png" alt="Logo" className="brand-logo" />
          <span className="brand-text">QPT</span>
        </Link>
        <nav className="app-nav-links" aria-label={t("nav.sectionLabel")}>
          <Link to="/" className="app-nav-link">
            {t("nav.home")}
          </Link>
          <Link to="/chat" className="app-nav-link">
            {t("nav.chat")}
          </Link>
          <Link to="/monitor" className="app-nav-link">
            {t("nav.monitor")}
          </Link>
        </nav>
        <div className="chrome-controls">
          <LanguageSwitcher />
          <ThemeToggle />
          <LoginButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
