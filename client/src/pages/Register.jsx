import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { avatarOptions } from "../data/avatarOptions.js";
import { useGoogleLogin } from "@react-oauth/google";

export default function Register() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [form, setForm] = useState({ username: "", email: "", password: "", avatar: "crown" });
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectedAvatar = avatarOptions.find((avatar) => avatar.id === form.avatar) || avatarOptions[0];

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        await googleLogin(tokenResponse.access_token);
        navigate("/");
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Google Login Failed"),
    flow: "implicit"
  });

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await register({
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        avatar: form.avatar
      });
      navigate("/verify-otp");
    } catch (error) {
      let msg = error.message;
      if (lang === "ar") {
        if (msg.includes("Email is already registered")) {
          msg = "البريد الإلكتروني مسجل بالفعل لمستخدم آخر!";
        } else if (msg.includes("Username is already taken")) {
          msg = "اسم المستخدم هذا محجوز بالفعل، اختر اسماً آخر!";
        }
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("createAccount")} subtitle={t("startAt0Elo")}>
      <form onSubmit={onSubmit} className="form auth-form">
        <label>{t("username")}<input required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
        <label>{t("email")}<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>{t("password")}<input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <fieldset className="auth-avatar-field">
          <legend>{lang === "ar" ? "اختر صورة الحساب من القائمة" : "Choose an account avatar from the list"}</legend>
          <p>{lang === "ar" ? "لازم تختار صورة من الصور المتاحة هنا قبل إنشاء الحساب." : "Pick one of the available images here before creating your account."}</p>
          <div className="auth-avatar-dropdown">
            <button
              aria-expanded={avatarMenuOpen}
              aria-haspopup="listbox"
              className="auth-avatar-trigger"
              onClick={() => setAvatarMenuOpen((open) => !open)}
              type="button"
            >
              <span className="auth-avatar-selected">
                <img src={selectedAvatar.src} alt="" />
                <span>{selectedAvatar.label?.[lang] || selectedAvatar.name}</span>
              </span>
              <span className="auth-avatar-chevron">⌄</span>
            </button>
            {avatarMenuOpen && (
              <ul className="auth-avatar-menu" role="listbox" aria-label={lang === "ar" ? "قائمة صور الحساب" : "Account avatar list"}>
                {avatarOptions.map((avatar) => (
                  <li key={avatar.id} role="option" aria-selected={form.avatar === avatar.id}>
                    <button
                      className={form.avatar === avatar.id ? "auth-avatar-option is-selected" : "auth-avatar-option"}
                      onClick={() => {
                        setForm({ ...form, avatar: avatar.id });
                        setAvatarMenuOpen(false);
                      }}
                      type="button"
                    >
                      <img src={avatar.src} alt="" />
                      <span>{avatar.label?.[lang] || avatar.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>
        <button className="primary" disabled={loading}>{loading ? t("creating") : t("signUp")}</button>
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
          {lang === "ar" ? "إنشاء حساب باستخدام جوجل" : "Sign up with Google"}
        </button>
      </div>
      <p className="switch-auth">{t("alreadyHaveAccount")} <Link to="/login">{t("login")}</Link></p>
    </AuthShell>
  );
}
