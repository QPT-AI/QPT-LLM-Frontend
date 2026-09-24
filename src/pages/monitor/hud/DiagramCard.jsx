import { useTranslation } from "react-i18next";
import { Layers, RotateCcw } from "lucide-react";
import { useMonitorStore } from "../../../store/monitorStore";
import { ARCHITECTURES, MODEL, TOTAL_PARAMS, fmtParams } from "../../../config/architecture";
import Scene from "../Scene";
import LegendChips from "./LegendChips";

const VIEWS = [["perspective", "monitor.diagram.view.perspective"], ["front", "monitor.diagram.view.front"], ["side", "monitor.diagram.view.side"]];

/** The architecture diagram with its toolbar (architecture, view) and paradigm legend. */
export default function DiagramCard({ reduced }) {
  const { t } = useTranslation();
  const architecture = useMonitorStore((s) => s.ui.architecture);
  const view = useMonitorStore((s) => s.ui.view);
  const exploded = useMonitorStore((s) => s.ui.exploded);
  const { setArchitecture, setView, toggleExploded } = useMonitorStore.getState();

  return (
    <section className="mon-panel mon-diagram" aria-label={t("monitor.diagram.title")}>
      <header className="mon-panel__head mon-diagram__head">
        <div className="mon-diagram__title">
          <span>{t("monitor.diagram.title")}</span>
          <span className="mon-diagram__meta">{t("monitor.diagram.meta", { blocks: MODEL.blocks, heads: MODEL.heads, dModel: MODEL.dModel, params: fmtParams(TOTAL_PARAMS) })}</span>
        </div>
        <div className="mon-panel__tools">
          <div className="mon-seg" role="radiogroup" aria-label={t("monitor.diagram.architectureAria")}>
            {Object.values(ARCHITECTURES).map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={architecture === a.id} className={`mon-seg__btn ${architecture === a.id ? "is-active" : ""}`} onClick={() => setArchitecture(a.id)}>
                {t(a.labelKey)}
              </button>
            ))}
          </div>
          <div className="mon-seg" role="radiogroup" aria-label={t("monitor.diagram.viewAria")}>
            {VIEWS.map(([k, labelKey]) => (
              <button key={k} type="button" role="radio" aria-checked={view === k} className={`mon-seg__btn ${view === k ? "is-active" : ""}`} onClick={() => setView(k)}>
                {t(labelKey)}
              </button>
            ))}
          </div>
          <button type="button" className={`mon-btn ${exploded ? "is-active" : ""}`} aria-pressed={exploded} title={t("monitor.diagram.explodedTitle")} onClick={toggleExploded}>
            <Layers size={13} />{t("monitor.diagram.exploded")}
          </button>
          <button type="button" className="mon-btn mon-icon-btn" aria-label={t("monitor.diagram.resetView")} title={t("monitor.diagram.resetView")} onClick={() => setView(view)}><RotateCcw size={13} /></button>
        </div>
      </header>
      <div className="mon-diagram__legend"><LegendChips /></div>
      <div className="mon-diagram__stage">
        <div className="mon-canvas"><Scene reduced={reduced} /></div>
      </div>
    </section>
  );
}
