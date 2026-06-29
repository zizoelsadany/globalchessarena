import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crown,
  Globe2,
  HandHeart,
  History,
  Home,
  LogOut,
  Menu,
  Medal,
  Moon,
  Palette,
  PieChart,
  Search,
  Share2,
  Sun,
  Trophy,
  User,
  Wallet,
  ShieldAlert,
  X,
  Check,
  Bot,
  Brain,
  Coins,
  Flame,
  ShoppingBag,
  Award
} from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getAvatarSrc } from "../data/avatarOptions.js";
import { api } from "../services/api.js";

const supportPhone = "01026612375";

const boardThemes = [
  { id: "green", color: "#739552", label: { en: "Green", ar: "أخضر" } },
  { id: "brown", color: "#b58863", label: { en: "Brown", ar: "بني" } },
  { id: "blue", color: "#4b7399", label: { en: "Blue", ar: "أزرق" } },
  { id: "black", color: "#2b2b2b", label: { en: "Black", ar: "أسود" } }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState([]);

  useEffect(() => {
    if (user) {
      api("/gamification/shop")
        .then(data => {
          setPurchasedItems(data.purchasedItems || []);
        })
        .catch(err => console.error("Error loading purchased items:", err));
    }
  }, [user, location.pathname]);

  const ownedThemes = useMemo(() => {
    return purchasedItems
      .filter(item => item.item_type === "board_theme")
      .map(item => item.item_value);
  }, [purchasedItems]);

  const hasVipBadge = useMemo(() => {
    return purchasedItems.some(item => item.item_type === "badge" && item.item_value === "vip");
  }, [purchasedItems]);

  const availableThemes = useMemo(() => {
    const list = [...boardThemes];
    if (ownedThemes.includes("golden")) {
      list.push({ id: "golden", color: "#fbbf24", label: { en: "Golden", ar: "ذهبي" } });
    }
    if (ownedThemes.includes("neon")) {
      list.push({ id: "neon", color: "#06b6d4", label: { en: "Neon", ar: "نيون" } });
    }
    return list;
  }, [ownedThemes]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [targetInviteCode, setTargetInviteCode] = useState("");
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [pendingInviteId, setPendingInviteId] = useState(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };
  const [showPalette, setShowPalette] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("gca_sidebar_collapsed") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = useMemo(
    () => {
      const items = [
        { to: "/", label: t("dashboard"), icon: Home },
        { to: "/matchmaking", label: t("matchmaking"), icon: Search },
        { to: "/puzzles", label: lang === "ar" ? "الألغاز التكتيكية" : "Tactical Puzzles", icon: Brain },
        { to: "/ai-coach", label: lang === "ar" ? "المدرب الذكي" : "AI Coach", icon: Bot },
        { to: "/quests", label: lang === "ar" ? "المهام اليومية" : "Daily Quests", icon: Flame },
        { to: "/shop", label: lang === "ar" ? "المتجر" : "Shop", icon: ShoppingBag },
        { to: "/analysis", label: lang === "ar" ? "التحليل" : "Analysis", icon: PieChart },
        { to: "/tournaments", label: t("tournaments"), icon: Trophy },
        { to: "/leaderboard", label: t("leaderboard"), icon: Medal },
        { to: "/history", label: t("history"), icon: History },
        { to: "/profile", label: t("profile"), icon: User }
      ];
      if (user?.role === "admin") {
        items.push({ to: "/admin", label: t("admin"), icon: ShieldAlert });
      }
      return items;
    },
    [t, user, lang]
  );

  useEffect(() => {
    if (!socket) return undefined;

    function onMatchFound({ roomId, color }) {
      if (location.pathname === "/matchmaking") {
        return;
      }
      const colorText = color === "white" ? t("white") : t("black");
      toast.success(lang === "ar" ? `تم العثور على مباراة! ستلعب باللون ${colorText}.` : `Match found! You play as ${colorText}.`);
      navigate(`/game/${encodeURIComponent(roomId)}`, { state: { color } });
    }

    function onAdminNotification(payload) {
      if (!payload?.message) return;
      const notification = {
        id: Date.now(),
        message: payload.message,
        receivedAt: new Date().toLocaleTimeString()
      };
      setNotifications((items) => [notification, ...items].slice(0, 5));
      toast(payload.message);
    }

    socket.on("matchFound", onMatchFound);
    socket.on("adminNotification", onAdminNotification);
    return () => {
      socket.off("matchFound", onMatchFound);
      socket.off("adminNotification", onAdminNotification);
    };
  }, [socket, navigate, lang, t, location.pathname]);

  useEffect(() => {
    localStorage.setItem("gca_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  async function copySupportPhone() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(supportPhone);
    }
    toast.success(lang === "ar" ? "تم نسخ الرقم" : "Phone number copied");
  }

  function openInstapay() {
    window.location.href = "https://ipn.eg/S/zizoelsadany5/instapay/7O6Lqm";
  }

  function openVFCash() {
    window.open("http://vf.eg/vfcash?id=mt&qrId=nrvIyb", "_blank", "noopener,noreferrer");
  }

  function createInvite() {
    if (!socket) return toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected");
    setShowInviteModal(true);
    setInviteMessage("");
    setTargetInviteCode("");
  }

  useEffect(() => {
    if (!socket) return undefined;

    function onInviteCreated() {
      // preserve compatibility; not used in ID-based invite flow
    }

    function onGameInvite({ inviteId, from }) {
      setIncomingInvite({ inviteId, from });
      toast.success(lang === "ar" ? `لديك دعوة لعب من ${from.username}` : `Game invite from ${from.username}`);
    }

    function onInviteSent({ inviteId, target }) {
      setPendingInviteId(inviteId);
      setInviteMessage(lang === "ar" ? `تم إرسال الدعوة إلى ${target.username}` : `Invite sent to ${target.username}`);
    }

    function onInviteRejected({ inviteId, target }) {
      if (inviteId === pendingInviteId) {
        setInviteMessage(lang === "ar" ? `تم رفض الدعوة من ${target.username}` : `Invite rejected by ${target.username}`);
        setPendingInviteId(null);
      }
    }

    function onInviteRejectedAck({ inviteId }) {
      if (inviteId === incomingInvite?.inviteId) {
        setIncomingInvite(null);
        toast(lang === "ar" ? "تم رفض الدعوة" : "Invite rejected");
      }
    }

    function onInviteCanceled({ inviteId, target }) {
      if (inviteId === pendingInviteId) {
        setInviteMessage(lang === "ar" ? `تم إلغاء الدعوة من ${target.username}` : `Invite canceled by ${target.username}`);
        setPendingInviteId(null);
      }
      if (inviteId === incomingInvite?.inviteId) {
        setIncomingInvite(null);
        toast(lang === "ar" ? "تم إلغاء الدعوة" : "Invite canceled");
      }
    }

    socket.on("inviteCreated", onInviteCreated);
    socket.on("gameInvite", onGameInvite);
    socket.on("inviteSent", onInviteSent);
    socket.on("inviteRejected", onInviteRejected);
    socket.on("inviteRejectedAck", onInviteRejectedAck);
    socket.on("inviteCanceled", onInviteCanceled);

    return () => {
      socket.off("inviteCreated", onInviteCreated);
      socket.off("gameInvite", onGameInvite);
      socket.off("inviteSent", onInviteSent);
      socket.off("inviteRejected", onInviteRejected);
      socket.off("inviteRejectedAck", onInviteRejectedAck);
      socket.off("inviteCanceled", onInviteCanceled);
    };
  }, [socket, lang, pendingInviteId, incomingInvite]);

  function sendInvite() {
    if (!socket) return toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected");
    const code = targetInviteCode.trim();
    if (!/^\d{6}$/.test(code)) {
      return toast.error(lang === "ar" ? "أدخل معرف لاعب صالح من 6 أرقام" : "Enter a valid 6-digit player ID");
    }
    socket.emit("sendGameInvite", { targetCode: code });
    setInviteMessage(lang === "ar" ? "جار إرسال الدعوة..." : "Sending invite...");
  }

  function acceptInvite() {
    if (!socket || !incomingInvite) return;
    socket.emit("acceptGameInvite", { inviteId: incomingInvite.inviteId });
    setIncomingInvite(null);
  }

  function rejectInvite() {
    if (!socket || !incomingInvite) return;
    socket.emit("rejectGameInvite", { inviteId: incomingInvite.inviteId });
    setIncomingInvite(null);
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-is-collapsed" : ""}${mobileMenuOpen ? " mobile-menu-open" : ""}`}>
      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar glass${mobileMenuOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand" onClick={() => {
            navigate("/");
            setMobileMenuOpen(false);
          }}>

            <Crown size={28} />
            <div>
              <strong>Global Chess</strong>
              <span>Arena</span>
            </div>
          </div>
          <button
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="collapse-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
            type="button"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            aria-label={mobileMenuOpen ? (lang === "ar" ? "إغلاق القائمة" : "Close menu") : (lang === "ar" ? "فتح القائمة" : "Open menu")}
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((value) => !value)}
            type="button"
          >
            <Menu size={20} />
          </button>
        </div>

        {user && (
          <div className="sidebar-profile-widget">
            <div className="sidebar-profile-avatar-wrap">
              <div className="avatar sm">
                {user.avatar ? <img src={getAvatarSrc(user.avatar)} alt="" /> : user.username?.[0]}
              </div>
              {(user.role === "admin" || user.is_premium === 1) && (
                <span className="sidebar-profile-crown" title="Premium">
                  <Crown size={10} />
                </span>
              )}
            </div>
            <div className="sidebar-profile-info">
              <strong className="sidebar-profile-name">{user.username}</strong>
              <span className="sidebar-profile-elo">🏆 {user.elo_rating ?? 0} Elo</span>
              <div className="sidebar-profile-stats">
                <span className="sidebar-profile-stat-badge level">
                  Lv. {user.level ?? 1}
                </span>
                <span className="sidebar-profile-stat-badge coins">
                  <Coins size={12} />
                  {user.coins ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}

        <nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "active" : "")}
              title={label}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={24} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {!(user?.role === "admin" || user?.is_premium === 1) && (
          <div className="sidebar-block" style={{ paddingBottom: 0 }}>
            <button 
              className="primary premium-btn" 
              onClick={async () => {
                try {
                  const res = await api("/premium/checkout", { method: "POST" });
                  if (res.checkoutUrl) window.location.href = res.checkoutUrl;
                } catch (err) {
                  toast.error(err.message);
                }
              }}
              type="button"
              style={{
                background: "linear-gradient(135deg, #fbbf24, #d97706)",
                color: "#000",
                fontWeight: "800",
                boxShadow: "0 4px 15px rgba(251, 191, 36, 0.35)",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                justifyContent: "center",
                padding: "10px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              <Crown size={20} />
              <span>{lang === "ar" ? "اشترك في بريميوم" : "Go Premium"}</span>
            </button>
          </div>
        )}

        <div className="sidebar-block">
          <button className="primary support-btn" onClick={() => setShowSupportModal(true)} type="button">
            <HandHeart size={20} />
            <span>{lang === "ar" ? "دعم مادي" : "Support"}</span>
          </button>
          <button className="primary support-btn" onClick={createInvite} type="button" style={{ marginTop: "8px" }}>
            <Share2 size={20} />
            <span>{t("invite")}</span>
          </button>
        </div>

        <div className="sidebar-block palette-block">
          <button onClick={() => setShowPalette(!showPalette)} className="icon-text theme-trigger-btn" type="button">
            <Palette size={24} />
            <span>{t("boardThemes")}</span>
            {showPalette ? <ChevronUp className="chevron" size={16} /> : <ChevronDown className="chevron" size={16} />}
          </button>

          {showPalette && (
            <div className="palette-popover glass">
              {availableThemes.map((themeOption) => (
                <button
                  aria-label={themeOption.label[lang]}
                  className={colorTheme === themeOption.id ? "theme-dot is-selected" : "theme-dot"}
                  key={themeOption.id}
                  onClick={() => {
                    setColorTheme(themeOption.id);
                    setShowPalette(false);
                  }}
                  style={{ "--theme-color": themeOption.color }}
                  title={themeOption.label[lang]}
                  type="button"
                />
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="icon-text" onClick={toggleTheme} type="button">
            {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
            <span>{theme === "dark" ? (lang === "ar" ? "نهاري" : "Light") : lang === "ar" ? "ليلي" : "Dark"}</span>
          </button>
          <button className="icon-text language-pill" onClick={() => setLang((value) => (value === "en" ? "ar" : "en"))} type="button">
            <Globe2 size={24} />
            <span>{lang === "en" ? "AR" : "EN"}</span>
          </button>
          <button className="icon-text danger" onClick={logout} type="button">
            <LogOut size={24} />
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar glass">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label={mobileMenuOpen ? (lang === "ar" ? "إغلاق القائمة" : "Close menu") : (lang === "ar" ? "فتح القائمة" : "Open menu")}
            >
              <Menu size={20} />
            </button>
            <div>
              <span className="eyebrow">{lang === "ar" ? "مرحبا بك" : "Welcome"}</span>
              <h1 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <span className="topbar-username">{user?.username}</span>
                {hasVipBadge && (
                  <Award size={18} style={{ color: "#fbbf24", filter: "drop-shadow(0 0 4px rgba(251,191,36,0.5))" }} title="VIP Player" />
                )}
                {(user?.role === "admin" || user?.is_premium === 1) ? (
                  <Crown size={18} style={{ color: "#fbbf24", filter: "drop-shadow(0 0 4px rgba(251,191,36,0.5))" }} title="Premium Member" />
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const res = await api("/premium/checkout", { method: "POST" });
                        if (res.checkoutUrl) window.location.href = res.checkoutUrl;
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                    className="topbar-premium-btn"
                    style={{
                      background: "rgba(251,191,36,0.15)",
                      border: "1px solid rgba(251,191,36,0.4)",
                      color: "#fbbf24",
                      fontSize: "0.7rem",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Crown size={10} />
                    <span>{lang === "ar" ? "ترقية" : "Go Premium"}</span>
                  </button>
                )}
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user && (
              <div className="topbar-stats-desktop" style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "10px" }}>
                {/* Level Badge */}
                <div style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--line)",
                  padding: "6px 12px",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <span>Lv.</span>
                  <span style={{ color: "var(--accent)" }}>{user.level ?? 1}</span>
                </div>

                {/* Coins Counter */}
                <div style={{
                  background: "rgba(251, 191, 36, 0.08)",
                  border: "1px solid rgba(251, 191, 36, 0.25)",
                  padding: "6px 12px",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <Coins size={14} style={{ color: "#fbbf24" }} />
                  <span>{user.coins ?? 0}</span>
                </div>
              </div>
            )}
            <button
              type="button"
              className="icon-text"
              onClick={() => setShowNotifications((value) => !value)}
              style={{ position: "relative", minWidth: 44, justifyContent: "center" }}
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "white",
                    fontSize: "0.65rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </button>
            <div className="avatar">{user?.avatar ? <img src={getAvatarSrc(user.avatar)} alt="" /> : user?.username?.[0]}</div>
          </div>
          {showNotifications && (
            <div
              className="notification-dropdown glass"
              style={{
                position: "absolute",
                top: "100%",
                right: 12,
                width: 320,
                maxHeight: 320,
                overflowY: "auto",
                padding: 12,
                borderRadius: 12,
                boxShadow: "0 28px 60px rgba(0,0,0,0.18)",
                zIndex: 1100
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ fontSize: "1rem", color: "var(--text)" }}>{lang === "ar" ? "الإشعارات" : "Notifications"}</strong>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: "600",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                    >
                      {lang === "ar" ? "مسح الكل" : "Clear all"}
                    </button>
                  )}
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--text)",
                      display: "flex",
                      alignItems: "center"
                    }}
                    onClick={() => setShowNotifications(false)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  {lang === "ar" ? "لا توجد إشعارات جديدة" : "No new notifications"}
                </p>
              ) : (
                notifications.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--line)",
                      marginBottom: 8,
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: "1.3", flex: 1 }}>{note.message}</div>
                      <button
                        type="button"
                        onClick={() => removeNotification(note.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          transition: "all 0.2s ease",
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                          e.currentTarget.style.color = "#ff4d4d";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <small style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{note.receivedAt}</small>
                  </div>
                ))
              )}
            </div>
          )}
        </header>
        <Outlet />
        <footer className="app-footer">
          <div className="footer-content">
            <span className="footer-rights">{t("footerRights")}</span>
            <div className="footer-links">
              <span>
                {t("footerCreatedBy")}{" "}
                <a
                  href="https://www.linkedin.com/in/zizo-elsadany-718223375/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link-highlight"
                >
                  Abd Elaziz Elsadany
                </a>
              </span>
              <span className="footer-separator">|</span>
              <a
                href="https://zizo-portfolio-omega.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link-highlight"
              >
                {t("footerPortfolio")}
              </a>
            </div>
          </div>
        </footer>
      </main>

      {showSupportModal && (
        <div className="modal-backdrop" onClick={() => setShowSupportModal(false)}>
          <div className="modal-content glass" onClick={(event) => event.stopPropagation()}>
            <h2>{lang === "ar" ? "دعم مادي" : "Support"}</h2>
            <p>{lang === "ar" ? "ساعد في دعم اللعبة عبر Instapay:" : "Support the game via Instapay:"}</p>
            <div className="support-options">
              <button className="primary support-option" onClick={openInstapay} type="button">
                <Wallet size={18} />
                <span>Instapay</span>
              </button>
              <button className="primary support-option" onClick={openVFCash} type="button" style={{ marginTop: 8 }}>
                <Wallet size={18} />
                <span>{lang === "ar" ? "فودافون كاش" : "Vodafone Cash"}</span>
              </button>
            </div>
            <button className="primary danger-btn" onClick={() => setShowSupportModal(false)} type="button">
              {lang === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-backdrop" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content glass" onClick={(event) => event.stopPropagation()}>
            <h2>{t("inviteTitle")}</h2>
            <p>{t("inviteDescription")}</p>
            <div className="invite-id-block">
              <strong>{t("inviteYourId")}</strong>
              <div className="support-phone">
                <strong className="invite-id" style={{ wordBreak: "break-all" }}>{user?.invite_code || "------"}</strong>
                <button
                  className="icon-text"
                  type="button"
                  onClick={async () => {
                    if (navigator.clipboard && user?.invite_code) {
                      await navigator.clipboard.writeText(user.invite_code);
                      toast.success(t("linkCopied"));
                    }
                  }}
                >
                  {t("copy")}
                </button>
              </div>
            </div>
            <label>
              {t("inviteTargetLabel")}
              <input
                value={targetInviteCode}
                onChange={(event) => setTargetInviteCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t("inviteEnterId") || "185977"}
                maxLength={6}
                inputMode="numeric"
                pattern="\d*"
                className="invite-input"
              />
            </label>
            <div className="invite-actions">
              <button className="primary" type="button" onClick={sendInvite}>
                {t("inviteSend")}
              </button>
              <button className="primary danger-btn" onClick={() => setShowInviteModal(false)} type="button">
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
            {inviteMessage && <p className="muted" style={{ marginTop: 12 }}>{inviteMessage}</p>}
          </div>
        </div>
      )}
      {incomingInvite && (
        <div className="modal-backdrop" onClick={() => setIncomingInvite(null)}>
          <div className="modal-content glass" onClick={(event) => event.stopPropagation()}>
            <h2>{t("inviteReceivedTitle")}</h2>
            <p>{`${t("inviteReceivedText")} ${incomingInvite.from.username} (${incomingInvite.from.invite_code})`}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="primary" type="button" onClick={acceptInvite}>
                {t("inviteSend")}
              </button>
              <button className="primary danger-btn" type="button" onClick={rejectInvite}>
                {t("inviteRejected")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
