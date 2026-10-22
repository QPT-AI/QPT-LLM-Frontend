import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, RotateCcw, Square } from "lucide-react";
import { useMonitorStore } from "../../../store/monitorStore";
import { listTrainers } from "../../../services/runs";
import { fmtHMS, fmtSI } from "./format";
import Panel from "./Panel";

const STATUS_CLS = { running: "is-live", succeeded: "is-live", failed: "is-error", cancelled: "is-warn" };
// Train-record fields that are bookkeeping, not metrics.
const META_KEYS = new Set(["ts", "type", "record_type", "split", "step", "epoch", "elapsed_s", "steps_per_s", "model_type"]);

const initialValues = (trainer) =>
  Object.fromEntries((trainer?.params ?? []).map((p) => [p.name, p.type === "bool" ? !!p.default : String(p.default ?? "")]));

/** Parses form values against the trainer's param schema. Returns { params } or { errors }. */
function parseParams(trainer, values, t) {
  const params = {}, errors = {};
  for (const p of trainer.params) {
    const raw = values[p.name];
    if (p.choices?.length) { params[p.name] = p.choices[Number(raw)] ?? p.default; continue; }
    if (p.type === "bool") { params[p.name] = !!raw; continue; }
    if (p.type === "str") { params[p.name] = raw; continue; }
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) errors[p.name] = t("monitor.run.errNumber");
    else if (p.type === "int" && !Number.isInteger(n)) errors[p.name] = t("monitor.run.errInteger");
    else if ((p.min != null && n < p.min) || (p.max != null && n > p.max)) errors[p.name] = rangeText(p, t);
    else params[p.name] = n;
  }
  return Object.keys(errors).length ? { errors } : { params };
}

function rangeText(p, t) {
  if (p.min != null && p.max != null) return t("monitor.run.range", { min: p.min, max: p.max });
  if (p.min != null) return t("monitor.run.min", { min: p.min });
  if (p.max != null) return t("monitor.run.max", { max: p.max });
  return "";
}

function ParamField({ param: p, value, error, onChange, disabled }) {
  const id = `mon-run-${p.name}`;
  let input;
  if (p.choices?.length) {
    input = (
      <select id={id} className="mon-select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {p.choices.map((c, i) => <option key={String(c)} value={i}>{String(c)}</option>)}
      </select>
    );
  } else if (p.type === "bool") {
    input = <input id={id} type="checkbox" checked={!!value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />;
  } else {
    const numeric = p.type === "int" || p.type === "float";
    input = (
      <input
        id={id}
        className="mon-input"
        type={numeric ? "number" : "text"}
        inputMode={numeric ? (p.type === "int" ? "numeric" : "decimal") : undefined}
        step={p.type === "int" ? 1 : "any"}
        min={p.min ?? undefined}
        max={p.max ?? undefined}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <div className="mon-run__field">
      <label htmlFor={id} className="mon-stat__label">{p.name} <span className="mon-run__type">{p.type}</span></label>
      {input}
      <span id={`${id}-hint`} className={`mon-hint ${error ? "mon-run__err" : ""}`}>{error || p.description}</span>
    </div>
  );
}

/** Real-data mode: pick an allowlisted trainer, start / cancel a backend run, see its latest metrics. */
export default function RunControl() {
  const { t } = useTranslation();
  const liveRun = useMonitorStore((s) => s.ui.liveRun);
  const train = useMonitorStore((s) => s.latest.train);
  const { startLiveRun, cancelLiveRun, clearLiveRun } = useMonitorStore.getState();

  const [trainers, setTrainers] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listTrainers()
      .then((list) => {
        if (!alive) return;
        setTrainers(list);
        const first = list.find((x) => x.name === liveRun.trainer) ?? list[0];
        if (first) { setName(first.name); setValues(initialValues(first)); }
      })
      .catch((e) => alive && setLoadError(e.message));
    return () => { alive = false; };
    // Load once per mount; the attached run only seeds the initial selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trainer = useMemo(() => trainers?.find((x) => x.name === name) ?? null, [trainers, name]);
  const running = liveRun.id && (liveRun.status === "running" || liveRun.status == null);

  const selectTrainer = (n) => {
    setName(n);
    setValues(initialValues(trainers.find((x) => x.name === n)));
    setErrors({});
    setSubmitError("");
  };

  async function onStart(e) {
    e.preventDefault();
    if (!trainer || busy) return;
    const parsed = parseParams(trainer, values, t);
    setErrors(parsed.errors ?? {});
    setSubmitError("");
    if (parsed.errors) return;
    setBusy(true);
    try { await startLiveRun(trainer.name, parsed.params); } catch (err) { setSubmitError(err.message); } finally { setBusy(false); }
  }

  async function onCancel() {
    setBusy(true);
    try { await cancelLiveRun(); } catch (err) { setSubmitError(err.message); } finally { setBusy(false); }
  }

  const metrics = train ? Object.entries(train).filter(([k, v]) => !META_KEYS.has(k) && Number.isFinite(v)) : [];

  const tools = liveRun.id && (
    <span className={`mon-status mon-run__status ${STATUS_CLS[liveRun.status] ?? "is-warn"}`} title={liveRun.id}>
      <span className="mon-status__dot" aria-hidden="true" />
      {liveRun.id.slice(0, 8)} · {liveRun.status ? t(`monitor.run.status.${liveRun.status}`) : t("monitor.appbar.status.connecting")}
    </span>
  );

  return (
    <Panel title={t("monitor.run.title")} tools={tools} className="mon-run">
      <div className="mon-run__grid">
        <form className="mon-run__form" onSubmit={onStart} noValidate>
          {loadError && <p className="mon-hint mon-run__err" role="alert">{t("monitor.run.loadError", { msg: loadError })}</p>}
          {!trainers && !loadError && <p className="mon-hint">{t("monitor.run.loading")}</p>}
          {trainers?.length === 0 && <p className="mon-hint">{t("monitor.run.noTrainers")}</p>}
          {trainers?.length > 0 && (
            <>
              <div className="mon-run__field">
                <label htmlFor="mon-run-trainer" className="mon-stat__label">{t("monitor.run.trainer")}</label>
                <select id="mon-run-trainer" className="mon-select" value={name} disabled={running} onChange={(e) => selectTrainer(e.target.value)}>
                  {trainers.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
                </select>
                {trainer?.description && <span className="mon-hint">{trainer.description}</span>}
              </div>
              {trainer?.params.map((p) => (
                <ParamField
                  key={p.name}
                  param={p}
                  value={values[p.name] ?? ""}
                  error={errors[p.name]}
                  disabled={running}
                  onChange={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
                />
              ))}
            </>
          )}
          {submitError && <p className="mon-hint mon-run__err" role="alert">{submitError}</p>}
          <div className="mon-run__actions">
            {running ? (
              <button type="button" className="mon-btn mon-btn--outline" disabled={busy} onClick={onCancel}>
                <Square size={12} />{t("monitor.run.cancel")}
              </button>
            ) : (
              <button type="submit" className="mon-btn mon-btn--outline" disabled={!trainer || busy}>
                <Play size={12} />{busy ? t("monitor.run.starting") : t("monitor.run.start")}
              </button>
            )}
            {liveRun.id && !running && (
              <button type="button" className="mon-btn" onClick={clearLiveRun}>
                <RotateCcw size={12} />{t("monitor.run.clear")}
              </button>
            )}
          </div>
        </form>

        <div className="mon-run__metrics" aria-live="polite">
          <div className="mon-stat"><span className="mon-stat__label">{t("monitor.run.step")}</span><span className="mon-value">{train?.step ?? "---"}</span></div>
          <div className="mon-stat"><span className="mon-stat__label">{t("monitor.run.elapsed")}</span><span className="mon-value">{fmtHMS(train?.elapsed_s)}</span></div>
          <div className="mon-stat"><span className="mon-stat__label">{t("monitor.run.stepsPerS")}</span><span className="mon-value">{fmtSI(train?.steps_per_s, 2)}</span></div>
          {metrics.length > 0 && <div className="mon-divider" />}
          {metrics.map(([k, v]) => (
            <div key={k} className="mon-stat"><span className="mon-stat__label">{k}</span><span className="mon-value">{Number.isInteger(v) ? v : v.toPrecision(5)}</span></div>
          ))}
          {!liveRun.id && <p className="mon-hint">{t("monitor.run.idle")}</p>}
        </div>
      </div>
    </Panel>
  );
}
