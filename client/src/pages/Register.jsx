import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { avatarOptions } from "../data/avatarOptions.js";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [form, setForm] = useState({ username: "", email: "", password: "", avatar: "crown" });
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectedAvatar = avatarOptions.find((avatar) => avatar.id === form.avatar) || avatarOptions[0];

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
      navigate("/");
    } catch (error) {
      toast.error(error.message);
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
      <p className="switch-auth">{t("alreadyHaveAccount")} <Link to="/login">{t("login")}</Link></p>
    </AuthShell>
  );
}
