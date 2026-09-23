import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { scrubConfidence } from "../diffusionScrub";
import Panel from "./Panel";

/** Live token stream: appended tokens (autoregressive) or per-position denoising confidence (diffusion). */
export default function GenerationStrip() {
  const { t } = useTranslation();
  const tokens = useMonitorStore((s) => s.latest.tokens);
  const architecture = useMonitorStore((s) => s.ui.architecture);
  const scrub = useMonitorStore((s) => s.ui.diffusionScrub);
  const setScrub = useMonitorStore((s) => s.setDiffusionScrub);
  const isDiffusion = architecture === "diffusion";

  const live = tokens && tokens.mode === (isDiffusion ? "diffusion" : "ar") ? tokens : null;
  const timestep = scrub ?? live?.timestep ?? 1000;
  const conf = (i) => (scrub != null ? scrubConfidence(i, scrub) : live?.confidences[i] ?? 0);

  const title = isDiffusion ? t("monitor.tokens.titleDiffusion") : t("monitor.tokens.titleAr");

  const tools = isDiffusion ? (
    <div className="mon-scrub">
      <span className="mon-stat__label">t</span>
      <input
        type="range" min="0" max="1000" step="20" dir="rtl"
        value={timestep}
        aria-label={t("monitor.tokens.timestepAria")}
        onChange={(e) => setScrub(Number(e.target.value))}
      />
      <span className="mon-value" style={{ minWidth: 34 }}>{Math.round(timestep)}</span>
      <button type="button" className={`mon-btn ${scrub == null ? "is-active" : ""}`} onClick={() => setScrub(null)} aria-label={t("monitor.tokens.followLive")}>{t("monitor.tokens.live")}</button>
    </div>
  ) : null;

  return (
    <Panel title={title} ariaLabel={title} tools={tools} fill>
      <div className="mon-tokens" aria-label={t("monitor.tokens.ariaLabel")}>
        {isDiffusion
          ? Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="mon-token mon-token--slot" style={{ opacity: 0.15 + 0.85 * conf(i) }}>
                {conf(i) > 0.45 ? live?.tokens[i] ?? "·" : "▒"}
              </span>
            ))
          : live?.tokens.map((tok, i) => (
              <span key={`${i}-${tok}`} className={`mon-token ${i === live.tokens.length - 1 ? "is-new" : ""}`} style={{ opacity: 0.35 + 0.65 * (live.confidences[i] ?? 0.5) }}>
                {tok}
              </span>
            ))}
        {!live && <span className="mon-hint">{t("monitor.tokens.waiting")}</span>}
      </div>
    </Panel>
  );
}
