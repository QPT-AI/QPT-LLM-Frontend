import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../../i18n";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || "en";
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeCode =
    SUPPORTED_LANGUAGES.find((l) => current.startsWith(l.code))?.code.toUpperCase() ?? "EN";

  const others = SUPPORTED_LANGUAGES.filter((l) => !current.startsWith(l.code));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="lang-active-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.languageLabel")}
        onClick={() => setOpen((v) => !v)}
      >
        {activeCode}
        <svg
          width="9"
          height="5"
          viewBox="0 0 9 5"
          fill="none"
          aria-hidden="true"
          style={{
            marginLeft: "5px",
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
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("nav.languageLabel")}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
            minWidth: "100%",
            borderRadius: "8px",
            background: "var(--bg-raise)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 100,
          }}
        >
          {others.map(({ code, label }) => (
            <li key={code} role="option" aria-selected={false}>
              <button
                type="button"
                className="lang-option-btn"
                onClick={() => {
                  i18n.changeLanguage(code);
                  setOpen(false);
                }}
              >
                {code.toUpperCase()}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}