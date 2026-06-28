import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Medal, Trophy, Crown } from "lucide-react";
import Loader from "../components/Loader.jsx";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getAvatarSrc } from "../data/avatarOptions.js";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    api("/users/leaderboard")
      .then((response) => setUsers(Array.isArray(response?.users) ? response.users : []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label={lang === "ar" ? "جاري تحميل قائمة المتصدرين..." : "Loading leaderboard..."} />;

  return (
    <section className="panel leaderboard-panel">
      <div className="panel-title">
        <Medal size={24} className="leaderboard-header-icon" />
        <h2>{t("leaderboard")}</h2>
      </div>
      <p className="leaderboard-subtitle">{t("topPlayersRanked")}</p>
      
      <div className="leaderboard-container">
        {users.map((player, index) => {
          const rank = index + 1;
          const rankClass = rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "rank-normal";
          
          return (
            <div className={`leader-row ${rankClass}`} key={player.id}>
              <div className="rank-badge-wrap">
                {rank === 1 && <Crown className="rank-icon gold-glow" size={20} />}
                {rank === 2 && <Trophy className="rank-icon silver-glow" size={20} />}
                {rank === 3 && <Medal className="rank-icon bronze-glow" size={20} />}
                {rank > 3 && <span className="rank-number">#{rank}</span>}
              </div>
              
              <div className="leader-player-info">
                <div className="avatar sm leader-avatar">
                  {player.avatar ? <img src={getAvatarSrc(player.avatar)} alt="" /> : player.username[0]}
                </div>
                <strong className="player-name">{player.username}</strong>
              </div>
              
              <div className="player-elo-badge">
                <span>{player.elo_rating ?? 0}</span>
                <small>Elo</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
