import { Clock, Swords, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import OnlinePlayers from "../components/OnlinePlayers.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const { onlinePlayers } = useSocket();
  const { t } = useLanguage();

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">{t("rapid10m")}</span>
          <h2>{t("heroTitle")}</h2>
          <p>{t("heroSubtitle")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "16px" }}>
            <Link className="primary as-link" to="/matchmaking" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Users size={16} />
              {t("vsPlayer")}
            </Link>
            <Link
              className="primary as-link"
              to="/game/computer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--line)",
                color: "var(--text)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-glow)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "var(--line)";
              }}
            >
              🤖 {t("vsAI")}
            </Link>
          </div>
        </div>
        <div className="mini-board" aria-hidden="true">
          {Array.from({ length: 64 }).map((_, index) => <span key={index} />)}
        </div>
      </section>
      <aside className="chess-activity panel">
        <div>
          <span className="eyebrow">{t("liveMatch")}</span>
          <h3>{t("tacticsBoard")}</h3>
          <p>{t("tacticsBoardCopy")}</p>
        </div>
        <div className="animated-chess-card" aria-hidden="true">
          <div className="orbit-board">
            {["♘", "♜", "♕", "♟"].map((piece, index) => (
              <span key={piece} style={{ "--piece-index": index }}>{piece}</span>
            ))}
          </div>
          <div className="move-feed">
            <strong>e4</strong>
            <strong>c5</strong>
            <strong>Nf3</strong>
          </div>
        </div>
      </aside>
      <div className="stats-grid">
        <StatCard label={t("yourElo")} value={user?.elo_rating ?? 0} icon={<Trophy />} />
        <StatCard label={t("online")} value={onlinePlayers.length} icon={<Users />} />
        <StatCard label={t("mode")} value={t("rapid")} icon={<Clock />} />
        <StatCard label={t("rules")} value={t("rated")} icon={<Swords />} />
      </div>
      <OnlinePlayers />
    </div>
  );
}
