import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { fetchTournaments, joinTournament } from "../services/tournaments.js";
import { normalizeAssetUrl } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { toast } from "react-hot-toast";

export default function TournamentSlider({ layout = "default" }) {
  const { t, lang } = useLanguage();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchTournaments()
      .then((tournaments) => setTournaments(Array.isArray(tournaments) ? tournaments : []))
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

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <section className={`panel tournament-slider-section ${layout === "sidebar" ? "tournament-slider-sidebar" : ""}`}>
        <div className="skeleton-slider">
          <div className="skeleton-title"></div>
          <div className="skeleton-cards">
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!tournaments.length) {
    if (layout === "sidebar") {
      return (
        <section className="panel tournament-slider-section tournament-slider-sidebar tournament-empty-sidebar">
          <div className="slider-header">
            <div className="panel-title">
              <div className="icon-wrapper">
                <Trophy size={18} className="glow-icon" />
              </div>
              <div className="title-text">
                <h2>{t("tournaments")}</h2>
              </div>
            </div>
          </div>
          <p className="sidebar-empty-copy">{t("noTournaments")}</p>
          <Link to="/tournaments" className="primary as-link sidebar-tournaments-link">
            {lang === "ar" ? "استكشف البطولات" : "Browse tournaments"}
            <ArrowRight size={16} />
          </Link>
        </section>
      );
    }
    return null;
  }

  return (
    <section className={`panel tournament-slider-section ${layout === "sidebar" ? "tournament-slider-sidebar" : ""}`}>
      <div className="slider-header">
        <div className="panel-title">
          <div className="icon-wrapper">
            <Trophy size={20} className="glow-icon" />
          </div>
          <div className="title-text">
            <h2>{t("tournaments")}</h2>
            <p className="subtitle">{lang === "ar" ? "تحدَّ أفضل اللاعبين وانضم للبطولات الحية" : "Challenge the best and join live tournaments"}</p>
          </div>
        </div>
        <div className="slider-controls">
          {layout !== "sidebar" ? (
            <>
              <button className="control-btn prev" onClick={() => scroll("left")} aria-label="Previous">
                <ChevronLeft size={20} />
              </button>
              <button className="control-btn next" onClick={() => scroll("right")} aria-label="Next">
                <ChevronRight size={20} />
              </button>
            </>
          ) : (
            <Link to="/tournaments" className="control-btn sidebar-view-all" aria-label={lang === "ar" ? "كل البطولات" : "All tournaments"}>
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </div>

      <div className={`slider-container ${layout === "sidebar" ? "slider-container-vertical" : ""}`} ref={scrollContainerRef}>
        <div className={`slider-track ${layout === "sidebar" ? "slider-track-vertical" : ""}`}>
          {tournaments.map((tournament) => {
            const participantCount = tournament.participant_count || 0;
            const maxParticipants = tournament.max_participants || 64;
            const fillPercentage = Math.min(100, (participantCount / maxParticipants) * 100);
            
            return (
              <div className={`tournament-slide-card ${tournament.status} ${layout === "sidebar" ? "tournament-slide-card-compact" : ""}`} key={tournament.id}>
                <div className="card-glow-overlay"></div>
                <div className="card-header">
                  <span className={`status-badge ${tournament.status}`}>
                    <span className="badge-dot"></span>
                    {tournament.status === "upcoming"
                      ? (lang === "ar" ? "قادم" : "Upcoming")
                      : tournament.status === "active"
                      ? (lang === "ar" ? "نشط" : "Active")
                      : (lang === "ar" ? "مكتمل" : "Completed")}
                  </span>
                  <div className="participants-count">
                    <Users size={14} />
                    <span>{participantCount}</span>
                  </div>
                </div>

                <div className="card-body">
                  {tournament.logo_url ? (
                    <img className="tournament-logo" src={normalizeAssetUrl(tournament.logo_url)} alt={tournament.name} />
                  ) : null}
                  <h3 className="tournament-title-name">{tournament.name}</h3>
                  <p className="tournament-desc">{tournament.description || (lang === "ar" ? "لا يوجد وصف لهذه البطولة." : "No description available.")}</p>
                  <div className="tournament-meta-row">
                    <span>{tournament.participant_count ?? 0}/{tournament.max_participants ?? 64}</span>
                    <span>{tournament.ends_at ? new Date(tournament.ends_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: 'short', day: 'numeric' }) : (lang === "ar" ? "غير محدد" : "No end date")}</span>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="progress-container">
                    <div className="progress-bar-label">
                      <span>{lang === "ar" ? "نسبة التسجيل" : "Registration fill"}</span>
                      <span>{Math.round(fillPercentage)}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${fillPercentage}%` }}></div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      to={`/tournament/${tournament.id}`}
                      className="primary as-link"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 0 }}
                    >
                      {lang === "ar" ? "التفاصيل" : "Details"}
                    </Link>
                    <button
                      className={`join-action-btn ${tournament.joined ? "joined" : "primary"}`}
                      type="button"
                      disabled={Boolean(tournament.joined) || joining === tournament.id || tournament.status === "completed"}
                      onClick={() => handleJoin(tournament.id)}
                      style={{ flex: 1 }}
                    >
                      <span className="btn-content">
                        {tournament.joined
                          ? (lang === "ar" ? "منضم" : "Joined")
                          : tournament.status === "completed"
                          ? (lang === "ar" ? "انتهت" : "Ended")
                          : (lang === "ar" ? "انضم الآن" : "Join Now")}
                        {!tournament.joined && tournament.status !== "completed" && (
                          <ArrowRight size={16} className="arrow-icon" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

