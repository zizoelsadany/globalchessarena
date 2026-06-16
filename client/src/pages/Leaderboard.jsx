import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Medal } from "lucide-react";
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
      .then(({ users }) => setUsers(users))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label={lang === "ar" ? "جاري تحميل قائمة المتصدرين..." : "Loading leaderboard..."} />;

  return (
    <section className="panel">
      <div className="panel-title">
        <Medal size={18} />
        <h2>{t("leaderboard")}</h2>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "-10px 0 16px" }}>{t("topPlayersRanked")}</p>
      <div className="leaderboard">
        {users.map((player, index) => (
          <div className="leader-row" key={player.id}>
            <span className="rank">#{index + 1}</span>
            <div className="avatar sm">{player.avatar ? <img src={getAvatarSrc(player.avatar)} alt="" /> : player.username[0]}</div>
            <strong>{player.username}</strong>
            <span>{player.elo_rating ?? 0} Elo</span>
          </div>
        ))}
      </div>
    </section>
  );
}
