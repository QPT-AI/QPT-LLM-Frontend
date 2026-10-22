import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../store/monitorStore";
import { useReducedMotion } from "./monitor/hooks/useReducedMotion";
import { useResizableSplit } from "./monitor/hooks/useResizableSplit";
import AppBar from "./monitor/hud/AppBar";
import KpiStrip from "./monitor/hud/KpiStrip";
import RunControl from "./monitor/hud/RunControl";
import DiagramCard from "./monitor/hud/DiagramCard";
import ComponentDetail from "./monitor/hud/ComponentDetail";
import GenerationStrip from "./monitor/hud/GenerationStrip";
import SubstrateReadout from "./monitor/hud/SubstrateReadout";
import EventLog from "./monitor/hud/EventLog";
import Tooltip from "./monitor/hud/Tooltip";
import "./monitor/monitor.css";
import "./monitor/hud/hud.css";

/**
 * Training monitor. Two halves under the app bar: every metric card on the left
 * (scrolls when needed), the 3D architecture diagram on the right. The divider
 * between them is user-resizable — see hooks/useResizableSplit. The app bar slides
 * between simulated and real (backend run) data; the source is built in
 * telemetry/createTelemetrySource.js and connect() is StrictMode-safe.
 */
export default function Monitor() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const split = useResizableSplit();
  const realData = useMonitorStore((s) => s.ui.dataMode === "real");

  useEffect(() => {
    const { init, disconnect } = useMonitorStore.getState();
    init();
    return disconnect;
  }, []);

  return (
    <div className="mon-root">
      <AppBar />
      <main className="mon-split" ref={split.rootRef}>
        <section className="mon-left" aria-label={t("monitor.aria.trainingMetrics")}>
          {realData && <RunControl />}
          <KpiStrip />
          <div className="mon-left__pair">
            <ComponentDetail />
            <SubstrateReadout />
          </div>
          <div className="mon-left__pair mon-left__pair--tall">
            <GenerationStrip />
            <EventLog />
          </div>
        </section>
        <div
          className={`mon-splitter ${split.dragging ? "is-dragging" : ""}`}
          role="separator"
          aria-orientation={split.orientation}
          aria-label={t("monitor.aria.resizeSplitter")}
          tabIndex={0}
          onPointerDown={split.onPointerDown}
          onKeyDown={split.onKeyDown}
          onDoubleClick={split.onDoubleClick}
        />
        <section className="mon-right" aria-label={t("monitor.diagram.title")}>
          <DiagramCard reduced={reduced} />
        </section>
      </main>
      <Tooltip />
    </div>
  );
}
