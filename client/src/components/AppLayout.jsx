import { useEffect, useMemo, useState } from "react";
import {
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
  Moon,
  Palette,
  Search,
  Share2,
  Sun,
  Trophy,
  User,
  Wallet,
  ShieldAlert
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getAvatarSrc } from "../data/avatarOptions.js";

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
  const { socket } = useSocket();

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [targetInviteCode, setTargetInviteCode] = useState("");
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [pendingInviteId, setPendingInviteId] = useState(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("gca_sidebar_collapsed") === "true");

  const navItems = useMemo(
    () => {
      const items = [
        { to: "/", label: t("dashboard"), icon: Home },
        { to: "/matchmaking", label: t("matchmaking"), icon: Search },
        { to: "/leaderboard", label: t("leaderboard"), icon: Trophy },
        { to: "/history", label: t("history"), icon: History },
        { to: "/profile", label: t("profile"), icon: User }
      ];
      if (user?.role === "admin") {
        items.push({ to: "/admin", label: t("admin"), icon: ShieldAlert });
      }
      return items;
    },
    [t, user]
  );

  useEffect(() => {
    if (!socket) return undefined;

    function onMatchFound({ roomId, color }) {
      const colorText = color === "white" ? t("white") : t("black");
      toast.success(lang === "ar" ? `تم العثور على مباراة! ستلعب باللون ${colorText}.` : `Match found! You play as ${colorText}.`);
      navigate(`/game/${encodeURIComponent(roomId)}`, { state: { color } });
    }

    socket.on("matchFound", onMatchFound);
    return () => socket.off("matchFound", onMatchFound);
  }, [socket, navigate, lang, t]);

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
    <div className={sidebarCollapsed ? "app-shell sidebar-is-collapsed" : "app-shell"}>
      <aside className="sidebar glass">
        <div className="sidebar-head">
          <div className="brand" onClick={() => navigate("/")}>
            <Crown />
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
        </div>

        <nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")} title={label}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-block">
          <button className="primary support-btn" onClick={() => setShowSupportModal(true)} type="button">
            <HandHeart size={16} />
            <span>{lang === "ar" ? "دعم مادي" : "Support"}</span>
          </button>
          <button className="primary support-btn" onClick={createInvite} type="button" style={{ marginTop: "8px" }}>
            <Share2 size={16} />
            <span>{t("invite")}</span>
          </button>
        </div>

        <div className="sidebar-block palette-block">
          <button onClick={() => setShowPalette(!showPalette)} className="icon-text theme-trigger-btn" type="button">
            <Palette size={18} />
            <span>{t("boardThemes")}</span>
            {showPalette ? <ChevronUp className="chevron" size={16} /> : <ChevronDown className="chevron" size={16} />}
          </button>

          {showPalette && (
            <div className="palette-popover glass">
              {boardThemes.map((themeOption) => (
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
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? (lang === "ar" ? "نهاري" : "Light") : lang === "ar" ? "ليلي" : "Dark"}</span>
          </button>
          <button className="icon-text language-pill" onClick={() => setLang((value) => (value === "en" ? "ar" : "en"))} type="button">
            <Globe2 size={18} />
            <span>{lang === "en" ? "AR" : "EN"}</span>
          </button>
          <button className="icon-text danger" onClick={logout} type="button">
            <LogOut size={18} />
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar glass">
          <div>
            <span className="eyebrow">{lang === "ar" ? "مرحبا بك" : "Welcome"}</span>
            <h1>{user?.username}</h1>
          </div>
          <div className="avatar">{user?.avatar ? <img src={getAvatarSrc(user.avatar)} alt="" /> : user?.username?.[0]}</div>
        </header>
        <Outlet />
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
                onChange={(event) => setTargetInviteCode(event.target.value.replace(/\D/g, "").slice(0,6))}
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
      <footer className="app-footer glass" style={{ padding: "8px 12px", textAlign: "center", fontSize: "0.95rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span>Game developed by</span>
          <a
            href="https://www.linkedin.com/in/zizo-elsadany-718223375/?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
            target="_blank"
            rel="noreferrer"
            style={{ fontWeight: 600, color: "#1e90ff" }}
          >
            Abd Elaziz Elsadiny
          </a>
          <a
            href="https://zizo-portfolio-omega.vercel.app/"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "0.85rem", marginTop: 2, color: "#1e90ff" }}
          >
            Portfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
