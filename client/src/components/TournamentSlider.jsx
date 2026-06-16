import { useEffect, useState } from "react";
import { CupSoda, ArrowRight } from "lucide-react";
import { fetchTournaments, joinTournament } from "../services/tournaments.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { toast } from "react-hot-toast";

export default function TournamentSlider() {
  const { t, lang } = useLanguage();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);

  useEffect(() => {
    fetchTournaments()
      .then((data) => setTournaments(data.tournaments || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (tournamentId) => {
    setJoining(tournamentId);
    try {
      const { tournament } = await joinTournament(tournamentId);
      setTournaments((current) => current.map((item) => (item.id === tournament.id ? tournament : item)));
      toast.success(lang === "ar" ? "تم الانضمام إلى البطولة" : "Joined tournament");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setJoining(null);
    }
  };

  if (loading) {
    return <section className="panel tournament-slider"><p>{lang === "ar" ? "جارٍ تحميل البطولات..." : "Loading tournaments..."}</p></section>;
  }

  if (!tournaments.length) {
    return (
      <section className="panel tournament-slider">
        <div className="panel-title">
          <CupSoda size={18} />
          <h2>{t("tournaments")}</h2>
        </div>
        <p>{lang === "ar" ? "لا توجد بطولات متاحة حالياً." : "No tournaments available right now."}</p>
      </section>
    );
  }

  return (
    <section className="panel tournament-slider">
      <div className="panel-title">
        <CupSoda size={18} />
        <h2>{t("tournaments")}</h2>
      </div>
      <div className="tournament-list">
        {tournaments.map((tournament) => (
          <div className="tournament-card" key={tournament.id}>
            <div className="tournament-card-header">
              <strong>{tournament.name}</strong>
              <span>{tournament.status === "upcoming" ? (lang === "ar" ? "قادم" : "Upcoming") : tournament.status === "active" ? (lang === "ar" ? "فعال" : "Active") : (lang === "ar" ? "مكتمل" : "Completed")}</span>
            </div>
            <p>{tournament.description || (lang === "ar" ? "لا يوجد وصف." : "No description provided.")}</p>
            <div className="tournament-card-meta">
              <span>{tournament.participant_count || 0} {lang === "ar" ? "مشترك" : "participants"}</span>
              <button
                className="primary"
                type="button"
                disabled={Boolean(tournament.joined) || joining === tournament.id}
                onClick={() => handleJoin(tournament.id)}
              >
                {tournament.joined ? (lang === "ar" ? "منضم" : "Joined") : (lang === "ar" ? "انضم" : "Join")}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
