import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { api, setSession } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { avatarOptions, getAvatarSrc, normalizeAvatarValue, shopAvatars } from "../data/avatarOptions.js";

export default function Profile() {
  const { user, token, setUser, refreshUser } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
  }, [refreshUser]);

  const [form, setForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    avatar: normalizeAvatarValue(user?.avatar)
  });

  const [purchasedItems, setPurchasedItems] = useState([]);

  useEffect(() => {
    if (user) {
      api("/gamification/shop")
        .then((data) => {
          setPurchasedItems(data.purchasedItems || []);
        })
        .catch((err) => console.error("Error loading purchased items in Profile:", err));
    }
  }, [user]);

  const availableAvatars = useMemo(() => {
    const list = [...avatarOptions];
    purchasedItems.forEach(item => {
      if (item.item_type === "avatar" && shopAvatars[item.item_value]) {
        list.push(shopAvatars[item.item_value]);
      }
    });
    return list;
  }, [purchasedItems, user]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        username: user.username || "",
        email: user.email || "",
        avatar: normalizeAvatarValue(user.avatar)
      }));
    }
  }, [user]);
  const [saving, setSaving] = useState(false);
  const [pieceTheme, setPieceTheme] = useState(() => localStorage.getItem("gca_piece_theme") || "neo");
  const isPremium = user?.role === "admin" || user?.is_premium === 1;

  function handlePieceThemeChange(e) {
    const val = e.target.value;
    if (val !== "neo" && !isPremium) {
      toast.error(lang === "ar" ? "هذا المظهر مخصص للأعضاء المميزين (Premium) فقط!" : "This theme is for Premium members only!");
      return;
    }
    setPieceTheme(val);
    localStorage.setItem("gca_piece_theme", val);
    toast.success(lang === "ar" ? "تم تحديث مظهر القطع!" : "Piece theme updated!");
  }

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
          <p>Elo: {user?.elo_rating ?? 0} • ID: {user?.invite_code || "------"}</p>
        </div>
      </div>
      <form className="form compact" onSubmit={onSubmit}>
        <label>
          {t("username")}
          <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
        </label>
        <label>
          {lang === "ar" ? "البريد الإلكتروني" : "Email"}
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        {user?.hasPassword && (
          <label>
            {lang === "ar" ? "كلمة المرور الحالية" : "Current Password"}
            <input type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
          </label>
        )}
        <label>
          {user?.hasPassword ? (lang === "ar" ? "كلمة المرور الجديدة" : "New Password") : (lang === "ar" ? "إنشاء كلمة مرور" : "Create Password")}
          <input type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
        </label>
        <div className="avatar-picker" aria-label={lang === "ar" ? "اختيار صورة اللاعب" : "Choose player avatar"}>
          {availableAvatars.map((avatar) => (
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

        <div style={{ marginTop: "24px", marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "12px", fontWeight: "700", fontSize: "0.95rem" }}>
            {lang === "ar" ? "مظهر قطع الشطرنج" : "Chess Piece Theme"}
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "12px"
          }}>
            {[
              { id: "neo", nameEn: "Neo (Default)", nameAr: "نيو (الافتراضي)", isPremium: false },
              { id: "wood", nameEn: "Wood", nameAr: "خشبي", isPremium: true },
              { id: "neon", nameEn: "Neon", nameAr: "نيون", isPremium: true },
              { id: "gold", nameEn: "Gold", nameAr: "ذهبي", isPremium: true },
              { id: "glass", nameEn: "Glass", nameAr: "زجاجي", isPremium: true },
              { id: "classic", nameEn: "Classic", nameAr: "كلاسيكي", isPremium: true },
              { id: "alpha", nameEn: "Alpha", nameAr: "ألفا", isPremium: true }
            ].map((theme) => {
              const isSelected = pieceTheme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => {
                    const ownsTheme = purchasedItems.some(p => p.item_type === "pieces_theme" && p.item_value === theme.id);
                    if (theme.isPremium && !isPremium && !ownsTheme) {
                      toast.error(lang === "ar" ? "هذا المظهر مخصص للأعضاء المميزين أو يجب شراؤه من المتجر!" : "This theme is for Premium members or must be purchased from the store!");
                      return;
                    }
                    setPieceTheme(theme.id);
                    localStorage.setItem("gca_piece_theme", theme.id);
                    toast.success(lang === "ar" ? "تم تحديث مظهر القطع!" : "Piece theme updated!");
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                    backgroundColor: isSelected ? "var(--accent-glow)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <img
                    src={`https://images.chesscomfiles.com/chess-themes/pieces/${theme.id === "gold" ? "metal" : theme.id}/150/wn.png`}
                    alt={theme.id}
                    style={{ 
                      width: "50px", 
                      height: "50px", 
                      objectFit: "contain", 
                      marginBottom: "8px",
                      filter: theme.id === "gold"
                        ? "sepia(1) saturate(6) hue-rotate(10deg) brightness(1.0) contrast(1.1) drop-shadow(0 0 3px rgba(251, 191, 36, 0.7))"
                        : theme.id === "neon"
                        ? "drop-shadow(0 0 5px #06b6d4) brightness(1.2) saturate(1.5)"
                        : "none"
                    }}
                  />
                  <span style={{ fontSize: "0.82rem", fontWeight: "600", color: isSelected ? "var(--text)" : "var(--muted)" }}>
                    {lang === "ar" ? theme.nameAr : theme.nameEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button className="primary" disabled={saving}>
          {saving ? (lang === "ar" ? "جار الحفظ..." : "Saving...") : t("update")}
        </button>
      </form>
    </section>
  );
}
