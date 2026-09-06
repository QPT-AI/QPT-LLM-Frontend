import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

export default function LoginButton() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  return (
    <Link to="/login" className="login-btn">
      {t("nav.continue")}
    </Link>
  );
}
