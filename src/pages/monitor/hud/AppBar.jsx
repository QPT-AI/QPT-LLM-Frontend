import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Minus, Pause, Play, Plus } from "lucide-react";
import { useMonitorStore } from "../../../store/monitorStore";
import LanguageSwitcher from "../../../components/ui/LanguageSwitcher";
import ThemeToggle from "../../../components/ui/ThemeToggle";
import { fmtHMS, fmtStep } from "./format";

const SCALES = [0.25, 0.5, 1, 2, 4, 8];

const STATUS_KEY = {
  sim: "monitor.appbar.status.sim",
  live: "monitor.appbar.status.live",
  connecting: "monitor.appbar.status.connecting",
  awaiting: "monitor.awaiting",
  error: "monitor.appbar.status.error",
  idle: "monitor.appbar.status.idle",
};
const STATUS_CLS = { sim: "is-sim", live: "is-live", connecting: "is-warn", awaiting: "is-warn", error: "is-error", idle: "is-warn" };

export default function AppBar() {
  const { t } = useTranslation();
  const ui = useMonitorStore((s) => s.ui);
  const run = useMonitorStore((s) => s.run);
  const elapsed = useMonitorStore((s) => s.latest.train?.elapsed_s);
  const { togglePaused, setTimeScale } = useMonitorStore.getState();
  const live = ui.sourceKind !== "sim";
  const statusKey = STATUS_KEY[ui.connection] ?? STATUS_KEY.idle;
  const statusCls = STATUS_CLS[ui.connection] ?? STATUS_CLS.idle;

  const stepScale = (dir) => {
    const i = Math.max(0, Math.min(SCALES.length - 1, SCALES.indexOf(ui.timeScale) + dir));
    setTimeScale(SCALES[i]);
  };

  return (
    <header className="mon-appbar" role="banner">
      <Link to="/" className="mon-appbar__brand" aria-label="QPT home">
        <img src="/favicon.png" alt="" className="mon-appbar__logo" />
        <span className="mon-appbar__product">QPT <span>{t("monitor.title")}</span></span>
      </Link>
      <div className="mon-appbar__sep" aria-hidden="true" />
      <div className="mon-appbar__run">
        <span className="mon-appbar__runname">{run.name}</span>
        <span className="mon-appbar__meta">
          run <b>{run.runId}</b><i>·</i>step <b>{fmtStep(run.step)}</b><i>·</i>epoch <b>{run.epoch}</b><i>·</i><b>{fmtHMS(elapsed)}</b>
        </span>
      </div>

      <span className="mon-appbar__spacer" />

      <div className="mon-group" aria-label={t("monitor.appbar.playbackAria")}>
        <button type="button" className="mon-btn" aria-label={ui.paused ? t("monitor.appbar.resume") : t("monitor.appbar.pause")} aria-pressed={ui.paused} onClick={togglePaused}>
          {ui.paused ? <Play size={13} /> : <Pause size={13} />}
          {ui.paused ? t("monitor.appbar.resume") : t("monitor.appbar.pause")}
        </button>
        <button type="button" className="mon-btn mon-icon-btn" aria-label={t("monitor.appbar.slower")} disabled={ui.timeScale <= SCALES[0] || live} onClick={() => stepScale(-1)}><Minus size={12} /></button>
        <span className="mon-value" style={{ minWidth: 36, textAlign: "center" }} aria-live="polite">{ui.timeScale}×</span>
        <button type="button" className="mon-btn mon-icon-btn" aria-label={t("monitor.appbar.faster")} disabled={ui.timeScale >= SCALES.at(-1) || live} onClick={() => stepScale(1)}><Plus size={12} /></button>
      </div>

      <span className={`mon-status ${statusCls}`} role="status">
        <span className="mon-status__dot" aria-hidden="true" />
        {t(statusKey)}
      </span>

      <LanguageSwitcher />
      <ThemeToggle />

      <Link to="/" className="mon-btn mon-btn--outline" aria-label={t("monitor.back")}><ArrowLeft size={13} />{t("monitor.back")}</Link>
    </header>
  );
}
