import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";

export default function OnePager() {
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
        <section className="op-hero op-section">
          <div className="op-hero-eyebrow">{t("onePager.hero.eyebrow")}</div>
          <h1>
            <span className="q">Q</span>
            <span className="p">P</span>
            <span className="t">T</span>
          </h1>
          <br/>
          <Trans i18nKey="onePager.hero.uvp" components={{ em: <em /> }} />
          <div className="op-hero-foot">
            <span>
              <b>3</b> {t("onePager.hero.stats.paradigmsProd")}
            </span>
            <span>
              <b>5</b> {t("onePager.hero.stats.paradigmsRoadmap")}
            </span>
            <span>
              <b>10</b> {t("onePager.hero.stats.phases")}
            </span>
          </div>
        </section>

        <section className="op-section">
          <div className="op-eyebrow">{t("onePager.market.eyebrow")}</div>
          <h2 className="op-h2">{t("onePager.market.title")}</h2>
          <div className="op-mkt-grid">
            <div>
              <p className="op-lead">{t("onePager.market.lead")}</p>
              <div className="op-legend">
                <div className="op-legend-row">
                  <span className="op-dot" style={{ background: "var(--quantum)" }}></span>
                  <span>{t("onePager.market.legend.quantum")}</span>
                  <span>— {t("onePager.market.legend.quantumDesc")}</span>
                </div>
                <div className="op-legend-row">
                  <span className="op-dot" style={{ background: "var(--photonic)" }}></span>
                  <span>{t("onePager.market.legend.ai")}</span>
                  <span>— {t("onePager.market.legend.aiDesc")}</span>
                </div>
                <div className="op-legend-row">
                  <span className="op-dot" style={{ background: "var(--bio)" }}></span>
                  <span>{t("onePager.market.legend.sustainable")}</span>
                  <span>— {t("onePager.market.legend.sustainableDesc")}</span>
                </div>
                <div className="op-legend-row">
                  <span className="op-dot" style={{ background: "var(--thermo)" }}></span>
                  <span>{t("onePager.market.legend.research")}</span>
                  <span>— {t("onePager.market.legend.researchDesc")}</span>
                </div>
                <div className="op-legend-row">
                  <span className="op-dot" style={{ background: "var(--ternary)" }}></span>
                  <span>{t("onePager.market.legend.openSource")}</span>
                  <span>— {t("onePager.market.legend.openSourceDesc")}</span>
                </div>
              </div>
            </div>
            <div className="op-venn-wrap op-instrument">
              <svg viewBox="0 0 400 340" width="100%" aria-label="Intersection diagram">
                <g fill="none" strokeWidth="1.2">
                  <circle cx="160" cy="130" r="105" stroke="var(--quantum)" opacity=".8" />
                  <circle cx="240" cy="130" r="105" stroke="var(--photonic)" opacity=".8" />
                  <circle cx="200" cy="200" r="105" stroke="var(--bio)" opacity=".8" />
                  <circle cx="130" cy="205" r="80" stroke="var(--thermo)" opacity=".7" />
                  <circle cx="270" cy="205" r="80" stroke="var(--ternary)" opacity=".7" />
                </g>
                <text
                  x="200"
                  y="152"
                  textAnchor="middle"
                  className="op-venn-title"
                  fontFamily="Space Grotesk"
                  fontWeight="700"
                  fontSize="26"
                >
                  QPT
                </text>
                <text
                  x="200"
                  y="172"
                  textAnchor="middle"
                  className="op-venn-sub"
                  fontFamily="IBM Plex Mono"
                  fontSize="9"
                  letterSpacing="2"
                >
                  THE INTERSECTION
                </text>
                <text
                  x="105"
                  y="60"
                  fill="var(--quantum)"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  QUANTUM
                </text>
                <text
                  x="295"
                  y="60"
                  fill="var(--photonic)"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  AI
                </text>
                <text
                  x="200"
                  y="322"
                  fill="var(--bio)"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  SUSTAINABLE
                </text>
                <text
                  x="22"
                  y="292"
                  fill="var(--thermo)"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  RESEARCH
                </text>
                <text
                  x="292"
                  y="292"
                  fill="var(--ternary)"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  letterSpacing="1.5"
                >
                  OPEN SOURCE
                </text>
              </svg>
            </div>
          </div>
        </section>

        <section className="op-section">
          <div className="op-eyebrow">{t("onePager.team.eyebrow")}</div>
          <h2 className="op-h2">{t("onePager.team.title")}</h2>
          <div className="op-team">
            <div className="op-member op-instrument">
              <div className="role">
                <span className="op-dot" style={{ background: "var(--ink)" }}></span>
                {t("onePager.team.ceo.role")}
              </div>
              <div className="name">Daniel Arango Sohm</div>
              <div className="desc">{t("onePager.team.ceo.desc")}</div>
            </div>
            <div className="op-member op-instrument">
              <div className="role">
                <span className="op-dot" style={{ background: "var(--photonic)" }}></span>
                {t("onePager.team.ctoMulti.role")}
              </div>
              <div className="name">Simon Escobar Dias</div>
              <div className="desc">{t("onePager.team.ctoMulti.desc")}</div>
            </div>
            <div className="op-member op-instrument">
              <div className="role">
                <span className="op-dot" style={{ background: "var(--quantum)" }}></span>
                {t("onePager.team.ctoAi.role")}
              </div>
              <div className="name">Jeronimo Hoyos</div>
              <div className="desc">{t("onePager.team.ctoAi.desc")}</div>
            </div>
            <div className="op-member op-instrument">
              <div className="role">
                <span className="op-dot" style={{ background: "var(--ternary)" }}></span>
                {t("onePager.team.legal.role")}
              </div>
              <div className="name">Karina Villegas Uribe</div>
              <div className="desc">{t("onePager.team.legal.desc")}</div>
            </div>
          </div>
        </section>

        <section className="op-section">
          <div className="op-eyebrow">{t("onePager.phases.eyebrow")}</div>
          <h2 className="op-h2">{t("onePager.phases.title")}</h2>
          <div className="op-timeline">
            <div className="op-phase" data-tags="llm">
              <div className="op-phase-head">
                <span className="op-phase-num">P—01</span>
                <span className="op-phase-title">{t("onePager.phases.p1.title")}</span>
                <span className="op-tags">
                  <span className="op-tag g">{t("onePager.tags.llm")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p1.desc")}</div>
            </div>
            <div className="op-phase" data-tags="quantum photonic thermo">
              <div className="op-phase-head">
                <span className="op-phase-num">P—02</span>
                <span className="op-phase-title">{t("onePager.phases.p2.title")}</span>
                <span className="op-tags">
                  <span className="op-tag q">{t("onePager.tags.quantum")}</span>
                  <span className="op-tag p">{t("onePager.tags.photonic")}</span>
                  <span className="op-tag t">{t("onePager.tags.thermic")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p2.desc")}</div>
            </div>
            <div className="op-phase" data-tags="quantum photonic thermo">
              <div className="op-phase-head">
                <span className="op-phase-num">P—03</span>
                <span className="op-phase-title">{t("onePager.phases.p3.title")}</span>
                <span className="op-tags">
                  <span className="op-tag q">{t("onePager.tags.quantum")}</span>
                  <span className="op-tag p">{t("onePager.tags.photonic")}</span>
                  <span className="op-tag t">{t("onePager.tags.thermic")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p3.desc")}</div>
            </div>
            <div className="op-phase" data-tags="llm">
              <div className="op-phase-head">
                <span className="op-phase-num">P—04</span>
                <span className="op-phase-title">{t("onePager.phases.p4.title")}</span>
                <span className="op-tags">
                  <span className="op-tag g">{t("onePager.tags.llm")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p4.desc")}</div>
            </div>
            <div className="op-phase" data-tags="hybrid">
              <div className="op-phase-head">
                <span className="op-phase-num">P—05</span>
                <span className="op-phase-title">{t("onePager.phases.p5.title")}</span>
                <span className="op-tags">
                  <span className="op-tag g">{t("onePager.tags.hybrid")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p5.desc")}</div>
            </div>
            <div className="op-phase" data-tags="hybrid sim">
              <div className="op-phase-head">
                <span className="op-phase-num">P—06</span>
                <span className="op-phase-title">{t("onePager.phases.p6.title")}</span>
                <span className="op-tags">
                  <span className="op-tag g">{t("onePager.tags.hybrid")}</span>
                  <span className="op-tag g">{t("onePager.tags.simulation")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p6.desc")}</div>
            </div>
            <div className="op-phase" data-tags="quantum photonic thermo">
              <div className="op-phase-head">
                <span className="op-phase-num">P—07</span>
                <span className="op-phase-title">{t("onePager.phases.p7.title")}</span>
                <span className="op-tags">
                  <span className="op-tag q">{t("onePager.tags.quantum")}</span>
                  <span className="op-tag p">{t("onePager.tags.photonic")}</span>
                  <span className="op-tag t">{t("onePager.tags.thermic")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p7.desc")}</div>
            </div>
            <div className="op-phase" data-tags="quantum photonic thermo">
              <div className="op-phase-head">
                <span className="op-phase-num">P—08</span>
                <span className="op-phase-title">{t("onePager.phases.p8.title")}</span>
                <span className="op-tags">
                  <span className="op-tag q">{t("onePager.tags.quantum")}</span>
                  <span className="op-tag p">{t("onePager.tags.photonic")}</span>
                  <span className="op-tag t">{t("onePager.tags.thermic")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p8.desc")}</div>
            </div>
            <div className="op-phase" data-tags="hybrid">
              <div className="op-phase-head">
                <span className="op-phase-num">P—09</span>
                <span className="op-phase-title">{t("onePager.phases.p9.title")}</span>
                <span className="op-tags">
                  <span className="op-tag g">{t("onePager.tags.hybrid")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p9.desc")}</div>
            </div>
            <div className="op-phase" data-tags="bio ternary">
              <div className="op-phase-head">
                <span className="op-phase-num">P—10</span>
                <span className="op-phase-title">{t("onePager.phases.p10.title")}</span>
                <span className="op-tags">
                  <span className="op-tag b">{t("onePager.tags.bio")}</span>
                  <span className="op-tag g">{t("onePager.tags.ternary")}</span>
                </span>
              </div>
              <div className="op-phase-desc">{t("onePager.phases.p10.desc")}</div>
            </div>
          </div>
          <div className="op-spectrum" title={t("onePager.phases.spectrum")}></div>
        </section>

        <section className="op-section">
          <div className="op-eyebrow">{t("onePager.goal.eyebrow")}</div>
          <div className="op-goal op-instrument">
            <h3>
              <Trans i18nKey="onePager.goal.title" components={{ acc: <span className="acc" /> }} />
            </h3>
            <div className="op-goal-grid">
              <div className="op-goal-metric">
                <div className="v">{t("onePager.goal.cost.v")}</div>
                <div className="k">{t("onePager.goal.cost.k")}</div>
              </div>
              <div className="op-goal-metric">
                <div className="v">{t("onePager.goal.quality.v")}</div>
                <div className="k">{t("onePager.goal.quality.k")}</div>
              </div>
              <div className="op-goal-metric">
                <div className="v">{t("onePager.goal.time.v")}</div>
                <div className="k">{t("onePager.goal.time.k")}</div>
              </div>
              <div className="op-goal-metric">
                <div className="v">{t("onePager.goal.energy.v")}</div>
                <div className="k">{t("onePager.goal.energy.k")}</div>
              </div>
            </div>
            <p className="op-lead">{t("onePager.goal.lead")}</p>
          </div>
        </section>

        <footer className="op-footer">
          <span>{t("onePager.footer.brand")}</span>
          <span>{t("onePager.footer.tags")}</span>
        </footer>
      </div>
    </>
  );
}