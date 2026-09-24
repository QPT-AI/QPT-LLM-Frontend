import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { MODEL_PARAMS } from "../sim/curves";
import { fmtDelta, fmtFixed, fmtSI, fmtSci, fmtUsd } from "./format";
import Sparkline from "./Sparkline";

function Kpi({ label, value, unit, delta, badge, spark, version, log = false, threshold = null, warn = false }) {
  return (
    <div className={`mon-kpi ${warn ? "is-warn" : ""}`}>
      <div className="mon-kpi__label">{label}{badge && <span className="mon-badge">{badge}</span>}</div>
      <div className="mon-kpi__value">
        {value}{unit && <span className="mon-kpi__unit">{unit}</span>}
        {delta != null && Number.isFinite(delta) && delta !== 0 && (
          <span className={`mon-delta ${delta < 0 ? "is-down" : "is-up"}`}>{fmtDelta(delta, 4)}</span>
        )}
      </div>
      {spark && <Sparkline buffer={spark} version={version} log={log} threshold={threshold} height={22} label={`${label} history`} />}
    </div>
  );
}

/** Headline training metrics as stat tiles with sparklines. */
export default function KpiStrip() {
  const { t } = useTranslation();
  const train = useMonitorStore((s) => s.latest.train);
  const val = useMonitorStore((s) => s.latest.val);
  const derived = useMonitorStore((s) => s.derived);
  const version = useMonitorStore((s) => s.seriesVersion);
  const series = useMonitorStore((s) => s.series);
  const tokensPerS = series.tokensPerS.last();
  const flops = Number.isFinite(tokensPerS) ? 6 * MODEL_PARAMS * tokensPerS : NaN;

  return (
    <div className="mon-kpis" role="list" aria-label={t("monitor.kpi.ariaLabel")}>
      <Kpi label={t("monitor.kpi.trainingLoss")} value={fmtFixed(train?.loss, 4)} delta={derived.lossDelta} spark={series.loss} version={version} log />
      <Kpi label={t("monitor.kpi.validationLoss")} value={fmtFixed(val?.val_loss ?? train?.val_loss, 4)} delta={derived.valDelta} spark={series.valLoss} version={version} />
      <Kpi label={t("monitor.kpi.perplexity")} value={fmtFixed(train?.perplexity, 2)} />
      <Kpi label={t("monitor.kpi.learningRate")} value={fmtSci(train?.learning_rate, 2)} spark={series.lr} version={version} />
      <Kpi label={t("monitor.kpi.gradientNorm")} value={fmtFixed(train?.gradient_norm, 3)} badge={derived.clipping ? t("monitor.kpi.gradientNormBadge") : null} warn={derived.clipping} spark={series.gradNorm} version={version} threshold={1.0} />
      <Kpi label={t("monitor.kpi.throughput")} value={fmtSI(tokensPerS, 1)} unit="tok/s" spark={series.tokensPerS} version={version} />
      <Kpi label={t("monitor.kpi.compute")} value={fmtSI(flops, 1)} unit="FLOP/s" />
      <Kpi label={t("monitor.kpi.energyPerToken")} value={fmtFixed(train?.hardware_energy_joules_per_token, 3)} unit="J" spark={series.energyPerToken} version={version} />
      <Kpi label={t("monitor.kpi.runCost")} value={fmtUsd(train?.cumulative_cost_usd, 2)} spark={series.cost} version={version} />
    </div>
  );
}
