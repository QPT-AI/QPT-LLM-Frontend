import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useMonitorStore } from "../../../store/monitorStore";
import { PARADIGM_META } from "../../../config/paradigms";
import { ARCHITECTURES, SHAPE_PARAMS, fmtParams } from "../../../config/architecture";
import { fmtFixed, fmtPct, fmtSci } from "./format";
import Panel from "./Panel";

function Stat({ label, value, unit }) {
  return (
    <div className="mon-stat">
      <span className="mon-stat__label">{label}</span>
      <span className="mon-value">{value}{unit && <span className="mon-value--unit">{unit}</span>}</span>
    </div>
  );
}

/** The component under the pointer, or the one pinned by a click, with its per-block telemetry. */
export default function ComponentDetail() {
  const { t } = useTranslation();
  const selected = useMonitorStore((s) => s.ui.selected);
  const hovered = useMonitorStore((s) => s.ui.hovered);
  const setSelected = useMonitorStore((s) => s.setSelected);
  const arch = useMonitorStore((s) => ARCHITECTURES[s.ui.architecture]);
  const node = selected ?? hovered;
  const row = useMonitorStore((s) => (node?.layer != null ? s.perLayer[node.layer] : null));

  const tools = selected ? (
    <button type="button" className="mon-btn mon-icon-btn" aria-label={t("monitor.detail.clearSelection")} onClick={() => setSelected(null)}><X size={12} /></button>
  ) : null;

  return (
    <Panel title={selected ? t("monitor.detail.titlePinned") : t("monitor.detail.title")} tools={tools}>
      {!node && (
        <>
          <div className="mon-detail__title">{t("monitor.detail.decoding", { label: t(arch.labelKey) })}</div>
          <p className="mon-hint" style={{ margin: "0 0 8px" }}>{t(arch.summaryKey)}</p>
          <div className="mon-hint">{t("monitor.detail.hint")}</div>
        </>
      )}
      {node && (
        <>
          <div className="mon-detail__title">{t(node.labelKey, SHAPE_PARAMS)}</div>
          <div className="mon-stat">
            <span className="mon-stat__label">{t("monitor.detail.executedOn")}</span>
            <span className="mon-chip" style={{ "--c": PARADIGM_META[node.paradigm].color }}>
              <span className="mon-glyph">{PARADIGM_META[node.paradigm].glyph}</span>{t(`paradigms.${node.paradigm}`, PARADIGM_META[node.paradigm].label)}
            </span>
          </div>
          <div className="mon-stat"><span className="mon-stat__label">{t("monitor.detail.tensor")}</span><span className="mon-value mon-value--wrap">{t(node.shapeKey, SHAPE_PARAMS)}</span></div>
          <Stat
            label={t("monitor.detail.parameters")}
            value={node.params > 0 ? (node.tied ? t("monitor.detail.parametersTied", { value: fmtParams(node.params) }) : fmtParams(node.params)) : t("monitor.detail.parametersNone")}
          />
          {row && (
            <>
              <div className="mon-divider" />
              <Stat label={t("monitor.detail.stepShare", { layer: node.layer })} value={fmtPct(row.pct_of_step)} />
              <Stat label={t("monitor.detail.energyPerStep")} value={fmtFixed(row.energy_j, 1)} unit="J" />
              <Stat label={t("monitor.detail.gradientShare")} value={fmtPct(row.gradContrib != null ? row.gradContrib * 100 : NaN)} />
              <Stat label={t("monitor.detail.updateRatio")} value={fmtSci(row.ratio)} />
              <Stat label={t("monitor.detail.ablationDelta")} value={fmtFixed(row.delta_loss, 3)} />
              <Stat label={t("monitor.detail.meanHeadEntropy")} value={fmtFixed(row.attn_entropy, 2)} unit="nats" />
            </>
          )}
        </>
      )}
    </Panel>
  );
}
