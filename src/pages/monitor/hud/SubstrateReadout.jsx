import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { PARADIGM_META, PARADIGM_ORDER } from "../../../config/paradigms";
import { fmtFixed, fmtPct, fmtSci, fmtUsd, fmtSI } from "./format";
import Panel from "./Panel";

function Stat({ label, value, unit }) {
  return (
    <div className="mon-stat">
      <span className="mon-stat__label">{label}</span>
      <span className="mon-value">{value}{unit && <span className="mon-value--unit">{unit}</span>}</span>
    </div>
  );
}

/** Hardware readout for one compute substrate. The paradigm follows the legend selection. */
export default function SubstrateReadout() {
  const { t } = useTranslation();
  const paradigm = useMonitorStore((s) => s.ui.paradigm);
  const setParadigm = useMonitorStore((s) => s.setParadigm);
  const sub = useMonitorStore((s) => s.latest.substrate);
  const train = useMonitorStore((s) => s.latest.train);
  const profile = useMonitorStore((s) => s.latest.profile);
  const meta = PARADIGM_META[paradigm];
  const tokensM = train ? train.tokens_processed / 1e6 : NaN;
  const power = sub?.power_w ?? profile?.avg_power_w;
  const util = sub ? sub.utilization / 100 : NaN;

  const tools = (
    <select className="mon-select" value={paradigm} onChange={(e) => setParadigm(e.target.value)} aria-label={t("monitor.substrate.title")}>
      {PARADIGM_ORDER.map((p) => <option key={p} value={p}>{t(`paradigms.${p}`, PARADIGM_META[p].label)}</option>)}
    </select>
  );

  return (
    <Panel
      title={<><span className="mon-glyph" style={{ "--c": meta.color }}>{meta.glyph}</span>{t("monitor.substrate.title")}</>}
      ariaLabel={t("monitor.substrate.title")}
      tools={tools} fill bodyClassName="mon-substrate"
    >
      <div>
        <Stat label={t("monitor.substrate.utilization")} value={fmtPct(sub?.utilization, 1)} />
        <div className="mon-bar" role="meter" aria-label={t("monitor.substrate.utilizationAria")} aria-valuenow={Math.round(util * 100) || 0} aria-valuemin={0} aria-valuemax={100}>
          <span className="mon-bar__fill" style={{ width: `${Number.isFinite(util) ? Math.min(100, util * 100) : 0}%`, background: meta.color }} />
        </div>
        <Stat label={t("monitor.substrate.throughput")} value={fmtSI(sub?.tokens_per_s, 1)} unit="tok/s" />
        <Stat label={t("monitor.substrate.latency")} value={fmtFixed(sub?.latency_ms, 1)} unit="ms" />
        <Stat label={t("monitor.substrate.errorRate")} value={fmtSci(sub?.error_rate, 1)} />
        <Stat label={t("monitor.substrate.thermal")} value={fmtFixed(sub?.thermal.value, 1)} unit={sub?.thermal.unit ?? ""} />
      </div>
      <div>
        <Stat label={t("monitor.substrate.powerDraw")} value={fmtFixed(power, 0)} unit="W" />
        <Stat label={t("monitor.substrate.memoryPeak")} value={fmtFixed(train?.vram_gb, 1)} unit="GB" />
        <Stat label={t("monitor.substrate.runEnergy")} value={fmtFixed(train ? train.cumulative_energy_j / 3.6e6 : NaN, 3)} unit="kWh" />
        <Stat label={t("monitor.substrate.runCost")} value={fmtUsd(train?.cumulative_cost_usd, 3)} />
        <Stat label={t("monitor.substrate.costPerMTokens")} value={fmtUsd(train && tokensM > 0 ? train.cumulative_cost_usd / tokensM : NaN, 4)} />
        <Stat label={t("monitor.substrate.energyPrice")} value={fmtSci(train?.cost_per_wh, 1)} unit="$/Wh" />
      </div>
    </Panel>
  );
}
