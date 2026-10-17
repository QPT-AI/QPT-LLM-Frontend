import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";

export default function Blog() {
  const { t } = useTranslation();

  return (
    <Layout minimal>
      <h1 className="sr-only">{t("nav.blog", "Blog")}</h1>
    </Layout>
  );
}
