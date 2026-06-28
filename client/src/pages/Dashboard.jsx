import { useEffect, useState, useRef } from "react";
import { ArrowRight, Clock, Cpu, Swords, Trophy, Users, Zap, Bot, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import OnlinePlayers from "../components/OnlinePlayers.jsx";
import FriendsList from "../components/FriendsList.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { trackVisit } from "../services/admin.js";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { onlinePlayers } = useSocket();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
  }, [refreshUser]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAiDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Count only once per browser session (tab)
    if (!sessionStorage.getItem("visit_tracked")) {
      sessionStorage.setItem("visit_tracked", "1");
      trackVisit();
    }
  }, []);

  return (
    <div className="page-grid dashboard-page">
      <section className="hero-panel-v2">
        <div className="hero-bg-pattern" aria-hidden="true">
          {Array.from({ length: 64 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="hero-content">
          <span className="eyebrow hero-badge">
            <Zap size={12} />
            {t("rapid10m")}
          </span>
          <h2>{t("heroTitle")}</h2>
          <p>{t("heroSubtitle")}</p>
          <div className="hero-actions" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <Link className="hero-btn hero-btn-primary" to="/matchmaking">
              <Users size={18} />
              <span>{t("vsPlayer")}</span>
              <ArrowRight size={16} className="hero-btn-arrow" />
            </Link>

            <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
              <button
                onClick={() => setShowAiDropdown(!showAiDropdown)}
                className="hero-btn hero-btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  padding: lang === "ar" ? "0 16px 0 20px" : "0 20px 0 16px",
                  minHeight: "52px",
                  fontWeight: "700"
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-glow)",
                  border: "1px solid var(--accent)",
                  boxShadow: "0 0 10px var(--accent-glow)"
                }}>
                  <Bot size={16} style={{ color: "var(--accent)" }} />
                </div>
                <span>{lang === "ar" ? "اللعب ضد الكمبيوتر" : "Play vs AI"}</span>
                <ChevronDown size={16} style={{
                  transform: showAiDropdown ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  color: "var(--text)"
                }} />
              </button>

              {showAiDropdown && (
                <div
                  className="glass"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: lang === "ar" ? "0" : "auto",
                    right: lang === "ar" ? "auto" : "0",
                    width: "240px",
                    borderRadius: "12px",
                    padding: "8px",
                    zIndex: 100,
                    backgroundColor: "var(--panel-solid)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  {[
                    { value: "easy", label: lang === "ar" ? "سهل" : "Easy", desc: lang === "ar" ? "للمبتدئين" : "For beginners", color: "#2ecc71" },
                    { value: "hard", label: lang === "ar" ? "صعب" : "Hard", desc: lang === "ar" ? "مباراة متوازنة" : "Balanced match", color: "#f1c40f" },
                    { value: "very_hard", label: lang === "ar" ? "صعب جداً" : "Very Hard", desc: lang === "ar" ? "تحدي حقيقي" : "Real challenge", color: "#e67e22" },
                    { value: "impossible", label: lang === "ar" ? "مستحيل" : "Impossible", desc: lang === "ar" ? "سيد شطرنج" : "Chess grandmaster", color: "#e74c3c" }
                  ].map((level) => (
                    <button
                      key={level.value}
                      onClick={() => {
                        setShowAiDropdown(false);
                        navigate(`/game/computer?level=${level.value}`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "transparent",
                        border: "none",
                        color: "var(--text)",
                        width: "100%",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--accent-glow)";
                        e.currentTarget.style.transform = lang === "ar" ? "translateX(-4px)" : "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.transform = "translateX(0px)";
                      }}
                    >
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: level.color,
                        flexShrink: 0
                      }} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: "700" }}>{level.label}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{level.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-chess-piece piece-queen">♛</div>
          <div className="hero-chess-piece piece-knight">♞</div>
          <div className="hero-chess-piece piece-rook">♜</div>
          <div className="hero-mini-board">
            {Array.from({ length: 64 }).map((_, index) => <span key={index} />)}
          </div>
        </div>
      </section>

      <aside className="chess-activity panel dashboard-sidebar">
        <div className="sidebar-intro">
          <span className="eyebrow">{t("liveMatch")}</span>
          <h3>{t("tacticsBoard")}</h3>
          <p>{t("tacticsBoardCopy")}</p>
        </div>
        <div className="animated-chess-card" aria-hidden="true">
          <div className="orbit-board larger-board">
            {["♘", "♜", "♕", "♟"].map((piece, index) => (
              <span key={piece} style={{ "--piece-index": index }}>{piece}</span>
            ))}
          </div>
          <div className="move-feed larger-feed">
            <strong>e4</strong>
            <strong>c5</strong>
            <strong>Nf3</strong>
          </div>
        </div>
      </aside>

      <div className="stats-grid-v2">
        <StatCard label={t("yourElo")} value={user?.elo_rating ?? 0} icon={<Trophy />} accent={0} />
        <StatCard label={t("online")} value={onlinePlayers.length} icon={<Users />} accent={80} />
        <StatCard label={t("mode")} value={t("rapid")} icon={<Clock />} accent={160} />
        <StatCard label={t("rules")} value={t("rated")} icon={<Swords />} accent={240} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginTop: "24px" }}>
        <FriendsList />
        <OnlinePlayers />
      </div>
    </div>
  );
}
