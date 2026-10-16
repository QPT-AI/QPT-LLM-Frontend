import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../config/constants";

export default function ModelSelector({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/openai/models`)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        setModels(list);
        setLoading(false);

        if (list.length === 0) return;
        const ids = list.map((m) => m.id);
        const stored = localStorage.getItem("qpt-chat-model");
        const next = ids.includes(value) ? value : ids.includes(stored) ? stored : ids[0];
        if (next !== value) onChange(next);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const disabled = loading || error || models.length === 0;
  const label = loading
    ? t("chat.modelLoading")
    : error || models.length === 0
      ? t("chat.modelError")
      : value;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="lang-active-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("chat.modelLabel")}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {label}
        {!disabled && (
          <svg
            width="9"
            height="5"
            viewBox="0 0 9 5"
            fill="none"
            aria-hidden="true"
            style={{
              marginLeft: "5px",
              flexShrink: 0,
              transition: "transform 180ms var(--ease-out)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path
              d="M1 1l3.5 3L8 1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open && !disabled && (
        <ul
          role="listbox"
          aria-label={t("chat.modelLabel")}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
            minWidth: "100%",
            maxHeight: 240,
            overflowY: "auto",
            borderRadius: "8px",
            background: "var(--bg-raise)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 100,
          }}
        >
          {models.map(({ id }) => (
            <li key={id} role="option" aria-selected={id === value}>
              <button
                type="button"
                className="lang-option-btn"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
