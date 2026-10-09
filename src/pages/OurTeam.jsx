import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import { TEAM, initials, hostname, roleKey } from "../config/team";

const AVATAR_COLORS = ["var(--quantum)", "var(--photonic)", "var(--thermo)", "var(--bio)", "var(--ternary)"];

export default function OurTeam() {
  const { t } = useTranslation();

  return (
    <>
      <header className="chrome chrome-top minimal">
        <Link to="/" className="brand-mark" aria-label="QPT home">
          <img src="/favicon.png" alt="QPT logo" className="brand-logo" />
        </Link>
        <div className="chrome-controls">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <div className="op-page">
        <section className="op-section team-section">
          <div className="op-eyebrow">{t("ourTeam.eyebrow")}</div>
          <h1 className="op-h2">{t("ourTeam.title")}</h1>
          <p className="op-lead">{t("ourTeam.lead")}</p>

          <ul className="team-grid">
            {TEAM.map((person, i) => (
              <li key={person.name} className="team-card">
                <div
                  className="team-avatar"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  aria-hidden="true"
                >
                  {initials(person.name)}
                </div>
                <h2 className="team-name">{person.name}</h2>
                <p className="team-role">
                  {person.role && t(`ourTeam.roles.${roleKey(person.role)}`, { defaultValue: person.role })}
                </p>
                {person.website && (
                  <a className="team-link" href={person.website} target="_blank" rel="noopener noreferrer">
                    {hostname(person.website)}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
