import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";

export default function Education() {
  const { t } = useTranslation();

  return (
    <Layout>
      <h1 className="sr-only">{t("nav.education", "Education")}</h1>
    </Layout>
  );
}
