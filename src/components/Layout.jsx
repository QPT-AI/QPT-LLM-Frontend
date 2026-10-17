import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import LoginButton from "../components/ui/LoginButton";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children, hideLoginButton = false, bare = false, minimal = false, fill = false }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const effectiveMinimal = minimal && !isAuthenticated;

  return (
    <div className={fill ? "app-shell app-shell-fill" : "app-shell"}>
      {!bare && (
        <header className={effectiveMinimal ? "chrome chrome-top minimal" : "chrome chrome-top app-nav"}>
          <Link to="/" className="brand-mark" aria-label="QPT home">
            <img src="/favicon.png" alt="QPT logo" className="brand-logo" />
          </Link>
          {!effectiveMinimal && (
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
          )}
          <div className="chrome-controls">
            <LanguageSwitcher />
            <ThemeToggle />
            {!hideLoginButton && <LoginButton />}
          </div>
        </header>
      )}
      <main className={bare ? "app-main app-main-bare" : "app-main"}>{children}</main>
      <footer className="layout-footer">
        <span>{t("footer.copyright")}</span>
      </footer>
    </div>
  );
}
