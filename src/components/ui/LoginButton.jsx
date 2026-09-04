import { useTranslation } from "react-i18next";
import { LOGIN_URL } from "../../config/constants";

export default function LoginButton() {
  const { t } = useTranslation();

  return (
    <a href={LOGIN_URL} className="login-btn">
      {t("nav.continue")}
    </a>
  );
}
