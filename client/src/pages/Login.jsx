import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGoogleLogin } from "@react-oauth/google";

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        await googleLogin(tokenResponse.access_token);
        navigate(from, { replace: true });
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Google Login Failed"),
    flow: "implicit" // this gives access_token, wait, backend expects id_token (credential).
  });

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
        <label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span>{t("password")}</span>
            <Link to="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--accent)", textDecoration: "none", fontWeight: "500" }}>
              {lang === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
            </Link>
          </div>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="primary" disabled={loading}>{loading ? t("signIn") : t("login")}</button>
      </form>
      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
        <button 
          type="button" 
          onClick={() => handleGoogleLogin()} 
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "12px",
            backgroundColor: "var(--panel-solid)",
            color: "var(--text)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.2s ease"
          }}
          className="google-btn-custom"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style={{ width: 20, height: 20 }} />
          {lang === "ar" ? "تسجيل الدخول باستخدام جوجل" : "Sign in with Google"}
        </button>
      </div>
      <p className="switch-auth">{t("dontHaveAccount")} <Link to="/register">{t("signUp")}</Link></p>
    </AuthShell>
  );
}
