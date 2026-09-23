import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { PARADIGM_META, PARADIGM_ORDER } from "../../../config/paradigms";
import { ARCHITECTURES, paradigmBreakdown } from "../../../config/architecture";

/** Paradigm legend overlaid on the diagram. Click a chip to isolate that paradigm's components. */
export default function LegendChips() {
  const { t } = useTranslation();
  const architecture = useMonitorStore((s) => s.ui.architecture);
  const highlight = useMonitorStore((s) => s.ui.highlight);
  const toggleHighlight = useMonitorStore((s) => s.toggleHighlight);
  const breakdown = useMemo(() => paradigmBreakdown(ARCHITECTURES[architecture]), [architecture]);

  return (
    <div className={`mon-chips ${highlight ? "has-active" : ""}`} role="listbox" aria-label={t("monitor.legend.ariaLabel")}>
      <span className="mon-chips__label">{t("monitor.legend.executedOn")}</span>
      {PARADIGM_ORDER.map((p) => {
        const m = PARADIGM_META[p];
        const name = t(`paradigms.${p}`, m.label);
        const b = breakdown[p] ?? { count: 0, share: 0 };
        return (
          <button
            key={p} type="button" role="option" aria-selected={highlight === p}
            className={`mon-chip-btn ${highlight === p ? "is-active" : ""}`}
            style={{ "--c": m.color }}
            title={t("monitor.legend.tooltip", { paradigm: name, count: b.count, share: (b.share * 100).toFixed(1) })}
            onClick={() => toggleHighlight(p)}
          >
            <span className={`mon-chip-btn__swatch mon-swatch--${p}`} aria-hidden="true" />
            <span className="mon-glyph">{m.glyph}</span>
            <span className="mon-chip-btn__name">{name}</span>
            <span className="mon-chip-btn__meta">{b.count} · {(b.share * 100).toFixed(0)}%</span>
          </button>
        );
      })}
    </div>
  );
}
