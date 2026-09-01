import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";

export default function Monitor() {
  const { t } = useTranslation();

  return (
    <Layout>
      <section className="monitor-page">
        <h1 className="monitor-title">{t("monitor.title")}</h1>
        <div className="monitor-grid">
          <div className="monitor-card">
            <span className="monitor-card-label">{t("monitor.cpu")}</span>
            <span className="monitor-card-value">--</span>
          </div>
          <div className="monitor-card">
            <span className="monitor-card-label">{t("monitor.memory")}</span>
            <span className="monitor-card-value">--</span>
          </div>
          <div className="monitor-card">
            <span className="monitor-card-label">{t("monitor.gpu")}</span>
            <span className="monitor-card-value">--</span>
          </div>
          <div className="monitor-card">
            <span className="monitor-card-label">{t("monitor.status")}</span>
            <span className="monitor-card-value">--</span>
          </div>
        </div>
      </section>
    </Layout>
  );
}
