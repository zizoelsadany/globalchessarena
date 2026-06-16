import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("welcomeBack")} subtitle={t("enterCredentials")}>
      <form onSubmit={onSubmit} className="form">
        <label>{t("email")}<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>{t("password")}<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="primary" disabled={loading}>{loading ? t("signIn") : t("login")}</button>
      </form>
      <p className="switch-auth">{t("dontHaveAccount")} <Link to="/register">{t("signUp")}</Link></p>
    </AuthShell>
  );
}
