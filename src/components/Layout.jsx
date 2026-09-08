import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import LoginButton from "../components/ui/LoginButton";

export default function Layout({ children, hideLoginButton = false, bare = false, minimal = false }) {
  const { t } = useTranslation();

  return (
    <div className="app-shell">
      {!bare && (
        <header className={minimal ? "chrome chrome-top minimal" : "chrome chrome-top app-nav"}>
          {!minimal && (
            <>
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
            </>
          )}
          <div className="chrome-controls">
            <LanguageSwitcher />
            <ThemeToggle />
            {!hideLoginButton && <LoginButton />}
          </div>
        </header>
      )}
      <main className={bare ? "app-main app-main-bare" : "app-main"}>{children}</main>
    </div>
  );
}
