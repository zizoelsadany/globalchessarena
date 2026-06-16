import { useState } from "react";
import toast from "react-hot-toast";
import { api, setSession } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { avatarOptions, getAvatarSrc, normalizeAvatarValue } from "../data/avatarOptions.js";

export default function Profile() {
  const { user, token, setUser } = useAuth();
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({
    username: user?.username || "",
    avatar: normalizeAvatarValue(user?.avatar)
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          avatar: normalizeAvatarValue(form.avatar)
        })
      });
      setUser(data.user);
      setSession({ token, user: data.user });
      toast.success(lang === "ar" ? "تم تحديث الملف الشخصي" : "Profile updated");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-page panel">
      <div className="profile-hero">
        <div className="avatar xl">{user?.avatar ? <img src={getAvatarSrc(user.avatar)} alt="" /> : user?.username?.[0]}</div>
        <div>
          <span className="eyebrow">{t("profile")}</span>
          <h2>{user?.username}</h2>
          <p>{user?.elo_rating ?? 0} Elo • ID: {user?.invite_code || "------"}</p>
        </div>
      </div>
      <form className="form compact" onSubmit={onSubmit}>
        <label>
          {t("username")}
          <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
        </label>
        <div className="avatar-picker" aria-label={lang === "ar" ? "اختيار صورة اللاعب" : "Choose player avatar"}>
          {avatarOptions.map((avatar) => (
            <button
              className={form.avatar === avatar.id ? "avatar-choice is-selected" : "avatar-choice"}
              key={avatar.id}
              onClick={() => setForm({ ...form, avatar: avatar.id })}
              title={avatar.name}
              type="button"
            >
              <img src={avatar.src} alt="" />
            </button>
          ))}
        </div>
        <button className="primary" disabled={saving}>
          {saving ? (lang === "ar" ? "جار الحفظ..." : "Saving...") : t("update")}
        </button>
      </form>
    </section>
  );
}
