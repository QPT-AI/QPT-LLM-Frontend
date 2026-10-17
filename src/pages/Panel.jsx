import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";

export default function Panel() {
  const { t } = useTranslation();

  return (
    <Layout>
      <ul className="panel-list">
        <li>
          <Link to="/chat">{t("nav.chat")}</Link>
        </li>
        <li>
          <Link to="/monitor">{t("nav.monitor")}</Link>
        </li>
        <li>
          <Link to="/education">{t("nav.education", "Education")}</Link>
        </li>
        <li>
          <Link to="/blog">{t("nav.blog", "Blog")}</Link>
        </li>
      </ul>
    </Layout>
  );
}
