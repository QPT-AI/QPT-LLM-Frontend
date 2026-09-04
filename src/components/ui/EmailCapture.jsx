import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { registerEmail } from "../../services/notifications";

export default function EmailCapture() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const collapse = useCallback(() => {
    setExpanded(false);
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target) && status !== "success") {
        collapse();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded, status, collapse]);

  function handleOpen() {
    if (status !== "success") setExpanded(true);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") collapse();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      await registerEmail(email);
      setStatus("success");
      setTimeout(collapse, 2400);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      ref={containerRef}
      className="email-capture"
      onMouseEnter={handleOpen}
      onKeyDown={handleKeyDown}
    >
      {!expanded ? (
        <button
          type="button"
          className="footer-btn ghost"
          onClick={handleOpen}
          onFocus={handleOpen}
          aria-expanded={expanded}
        >
          {t("footer.stayInformed")}
        </button>
      ) : (
        <form className="email-capture-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email-capture-input" className="sr-only">
            {t("footer.emailLabel")}
          </label>
          <input
            id="email-capture-input"
            ref={inputRef}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder={t("footer.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading" || status === "success"}
            className="email-capture-input"
          />
          <button
            type="submit"
            className="email-capture-submit"
            disabled={status === "loading" || status === "success"}
            aria-label={t("footer.submit")}
          >
            {status === "loading" ? (
              <span className="email-capture-spinner" aria-hidden="true" />
            ) : status === "success" ? (
              <CheckIcon />
            ) : (
              <ArrowIcon />
            )}
          </button>
        </form>
      )}
      {status === "error" && (
        <span className="email-capture-error" role="alert">
          {t("footer.emailError")}
        </span>
      )}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}