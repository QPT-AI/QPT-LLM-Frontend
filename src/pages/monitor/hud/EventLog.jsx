import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { fmtStep } from "./format";
import Panel from "./Panel";

const LEVEL = { info: "INFO", warn: "WARN", error: "ERR " };

export default function EventLog() {
  const { t } = useTranslation();
  const logs = useMonitorStore((s) => s.logs);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <Panel title={t("monitor.log.title")} fill>
      <ul className="mon-log" ref={ref} role="log" aria-live="polite" aria-relevant="additions" style={{ height: "100%", overflow: "auto" }}>
        {[...logs].reverse().map((l) => (
          <li key={l.id} className={`is-${l.level}`}>
            <span className="mon-log__step">{fmtStep(l.step)}</span>
            <span className="mon-log__lvl">{LEVEL[l.level] ?? l.level}</span>
            <span className="mon-log__msg">{l.msg}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
