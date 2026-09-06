import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { API_BASE, GOOGLE_CLIENT_ID } from "../config/constants";
import { useAuth } from "../context/AuthContext";

const GIS_SRC = "https://accounts.google.com/gsi/client";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);

  const from = location.state?.from?.pathname || "/chat";

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) {
        setError(t("login.error"));
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id_token: response.credential }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.detail || res.statusText);
        }
        const data = await res.json();
        login(data.access_token, data.user);
        navigate(from, { replace: true });
      } catch (err) {
        setError(err.message || t("login.error"));
      } finally {
        setLoading(false);
      }
    },
    [login, navigate, from, t]
  );

  const initializeGsi = useCallback(() => {
    const accounts = window.google?.accounts?.id;
    if (!accounts) {
      setError(t("login.error"));
      return;
    }
    accounts.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
    if (buttonRef.current) {
      accounts.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: buttonRef.current.offsetWidth || 320,
        text: "signin_with",
        shape: "pill",
      });
    } else {
      accounts.prompt();
    }
  }, [handleCredentialResponse, t]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError(t("login.error"));
      return;
    }

    const existing = document.getElementById("gsi-client-script");
    if (existing) {
      initializeGsi();
      return;
    }

    const script = document.createElement("script");
    script.id = "gsi-client-script";
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initializeGsi;
    script.onerror = () => setError(t("login.error"));
    document.head.appendChild(script);

    return () => {
      window.google?.accounts?.id?.cancel();
    };
  }, [initializeGsi, t]);

  return (
    <Layout bare>
      <div className="login-page">
        <div className="login-card">
          <span className="login-brand">
            <img src="/favicon.png" alt="" className="brand-logo" />
          </span>
          <h1 className="login-title stroke-hair">{t("login.title")}</h1>
          <p className="login-subtitle">{t("login.subtitle")}</p>
          <div className="login-google" ref={buttonRef} aria-hidden={loading} />
          {loading && <span className="login-status">{t("login.processing")}</span>}
          {error && <span className="login-error">{error}</span>}
          <Link to="/" className="login-back">
            {t("login.back")}
          </Link>
        </div>
      </div>
    </Layout>
  );
}