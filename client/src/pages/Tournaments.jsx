import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Eye, Flag, Swords, Trophy, Users } from "lucide-react";
import toast from "react-hot-toast";
import { normalizeAssetUrl } from "../services/api.js";
import { fetchTournaments, joinTournament } from "../services/tournaments.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const statusColor = {
  upcoming: "#2f6fed",
  active: "#10b981",
  completed: "#6b7280",
  cancelled: "#ef4444"
};

export default function Tournaments() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTournaments()
      .then((data) => setTournaments(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const labels = useMemo(
    () => ({
      title: lang === "ar" ? "البطولات" : "Tournaments",
      subtitle:
        lang === "ar"
          ? "ادخل بطولة، تابع مكانك، وشغل مباراتك لما الدور يوصلك."
          : "Join events, track your spot, and enter your match when it is ready.",
      all: lang === "ar" ? "الكل" : "All",
      upcoming: lang === "ar" ? "قادمة" : "Upcoming",
      active: lang === "ar" ? "نشطة" : "Active",
      completed: lang === "ar" ? "مكتملة" : "Completed",
      cancelled: lang === "ar" ? "ملغاة" : "Cancelled",
      details: lang === "ar" ? "التفاصيل" : "Details",
      joinNow: lang === "ar" ? "انضم الآن" : "Join now",
      joining: lang === "ar" ? "جار الانضمام..." : "Joining...",
      joined: lang === "ar" ? "منضم" : "Joined",
      full: lang === "ar" ? "ممتلئة" : "Full",
      ended: lang === "ar" ? "انتهت" : "Ended",
      participants: lang === "ar" ? "اللاعبون" : "Players",
      ends: lang === "ar" ? "النهاية" : "Ends",
      fill: lang === "ar" ? "التسجيل" : "Fill",
      noDate: lang === "ar" ? "غير محدد" : "Not set",
      noDescription: lang === "ar" ? "بطولة مفتوحة لتحديات الشطرنج المباشر." : "Open event for live chess matches.",
      yourSeat: lang === "ar" ? "مكانك محفوظ في البطولة" : "Your seat is locked in",
      back: lang === "ar" ? "العودة للرئيسية" : "Back to home",
      emptyTitle: lang === "ar" ? "لا توجد بطولات حاليا" : "No tournaments yet",
      emptyCopy:
        lang === "ar"
          ? "عند إنشاء بطولة من الأدمن ستظهر هنا مباشرة بصورة البطولة وقائمة التسجيل."
          : "When the admin creates an event, it will appear here with its logo and registration list.",
      arena: lang === "ar" ? "ساحة البطولة" : "Tournament Arena",
      challenge: lang === "ar" ? "نظام بطولة حقيقي" : "A Real Event Flow",
      sideCopy:
        lang === "ar"
          ? "انضم، انتظر الجدول، ثم ادخل مباراتك من صفحة التفاصيل عندما يجهز الخصم."
          : "Join, wait for the schedule, then enter your match from the details page when your opponent is ready.",
      events: lang === "ar" ? "بطولة" : "Events"
    }),
    [lang]
  );

  const handleJoin = async (tournamentId) => {
    setJoining(tournamentId);
    try {
      const { tournament } = await joinTournament(tournamentId);
      setTournaments((current) =>
        current.map((item) => (item.id === tournament.id ? tournament : item))
      );
      toast.success(lang === "ar" ? "تم الانضمام إلى البطولة" : "Joined tournament");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setJoining(null);
    }
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    if (filter === "all") return tournament.status !== "cancelled";
    return tournament.status === filter;
  });

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })
      : labels.noDate;

  const markLogoAsBroken = (event) => {
    event.currentTarget.parentElement?.classList.add("is-broken");
  };

  if (loading) {
    return (
      <div className="page-grid tournaments-page">
        <section className="panel tournaments-main">
          <div className="skeleton-slider">
            <div className="skeleton-title" style={{ width: 220, height: 32 }} />
            <div className="skeleton-cards" style={{ marginTop: 24 }}>
              <div className="skeleton-card" style={{ height: 180, borderRadius: 22 }} />
              <div className="skeleton-card" style={{ height: 180, borderRadius: 22 }} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-grid tournaments-page">
      <section className="panel tournaments-main">
        <div className="panel-title tournaments-page-title">
          <div className="icon-wrapper tournaments-trophy-icon">
            <Trophy size={22} className="glow-icon" />
          </div>
          <div>
            <h2>{labels.title}</h2>
            <p className="page-subtitle">{labels.subtitle}</p>
          </div>
        </div>

        <div className="tournament-filters tournaments-filters-animate">
          {["all", "upcoming", "active", "completed"].map((value) => (
            <button
              key={value}
              className={`secondary filter-pill ${filter === value ? "active" : ""}`}
              onClick={() => setFilter(value)}
              type="button"
            >
              {labels[value]}
            </button>
          ))}
        </div>

        {filteredTournaments.length === 0 ? (
          <div className="empty-tournaments-state tournaments-empty-animate">
            <div className="empty-tournaments-card">
              <Trophy size={56} className="empty-icon" />
              <h3>{labels.emptyTitle}</h3>
              <p>{labels.emptyCopy}</p>
            </div>
          </div>
        ) : (
          <div className="tournaments-grid" key={filter}>
            {filteredTournaments.map((tournament, index) => {
              const participantCount = tournament.participant_count ?? 0;
              const maxParticipants = tournament.max_participants ?? 64;
              const fillPercentage = Math.min(100, Math.round((participantCount / maxParticipants) * 100));
              const isFull = participantCount >= maxParticipants;
              const isClosed = tournament.status === "completed" || tournament.status === "cancelled";
              const accent = tournament.style_color || statusColor[tournament.status] || statusColor.upcoming;

              return (
                <article
                  key={tournament.id}
                  className={`tournament-card-large tournaments-card-animate ${tournament.joined ? "is-joined" : ""}`}
                  style={{ "--card-index": index, "--tournament-accent": accent }}
                >
                  <div className="tournament-card-accent" aria-hidden="true" />
                  <div className="card-top">
                    <div className={`tournament-logo-frame ${tournament.logo_url ? "has-logo" : "no-logo"}`}>
                      {tournament.logo_url && (
                        <img
                          src={normalizeAssetUrl(tournament.logo_url)}
                          alt={tournament.name}
                          className="tournament-card-logo"
                          onError={markLogoAsBroken}
                        />
                      )}
                      <Trophy size={34} className="tournament-logo-fallback" />
                    </div>

                    <div className="card-info">
                      <div className="card-header-row">
                        <div>
                          <span className="tournament-kicker">
                            <Flag size={14} />
                            {labels.arena}
                          </span>
                          <h3>{tournament.name}</h3>
                          <p className="tournament-card-description">
                            {tournament.description || labels.noDescription}
                          </p>
                        </div>
                        <span className="tournament-status-chip">
                          {labels[tournament.status] || tournament.status}
                        </span>
                      </div>

                      <div className="tournament-stats-grid">
                        <div className="stat-block">
                          <Users size={17} />
                          <span>{labels.participants}</span>
                          <p>{participantCount}/{maxParticipants}</p>
                        </div>
                        <div className="stat-block">
                          <CalendarDays size={17} />
                          <span>{labels.ends}</span>
                          <p>{formatDate(tournament.ends_at)}</p>
                        </div>
                        <div className="stat-block">
                          <Swords size={17} />
                          <span>{labels.fill}</span>
                          <p>{fillPercentage}%</p>
                        </div>
                      </div>

                      <div className="tournament-progress">
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${fillPercentage}%` }} />
                        </div>
                      </div>

                      {tournament.joined && (
                        <div className="joined-tournament-note">
                          <CheckCircle2 size={17} />
                          <span>{labels.yourSeat}</span>
                        </div>
                      )}

                      <div className="tournament-actions-row">
                        <button
                          className="secondary as-link"
                          type="button"
                          onClick={() => navigate(`/tournament/${tournament.id}`)}
                        >
                          <Eye size={16} />
                          {labels.details}
                        </button>
                        <button
                          className={`primary as-link ${tournament.joined ? "secondary" : ""}`}
                          type="button"
                          disabled={Boolean(tournament.joined) || joining === tournament.id || isClosed || isFull}
                          onClick={() => handleJoin(tournament.id)}
                        >
                          {tournament.joined
                            ? labels.joined
                            : isFull
                            ? labels.full
                            : isClosed
                            ? labels.ended
                            : joining === tournament.id
                            ? labels.joining
                            : labels.joinNow}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <button className="secondary as-link tournaments-back-btn" onClick={() => navigate("/")} type="button">
          <ArrowLeft size={16} />
          {labels.back}
        </button>
      </section>

      <aside className="chess-activity panel tournaments-sidebar">
        <div className="sidebar-intro tournaments-sidebar-intro">
          <span className="eyebrow">{labels.arena}</span>
          <h3>{labels.challenge}</h3>
          <p>{labels.sideCopy}</p>
        </div>
        <div className="animated-chess-card tournaments-animated-card" aria-hidden="true">
          <div className="orbit-board">
            {["\u2658", "\u2656", "\u2655", "\u2659"].map((piece, index) => (
              <span key={piece} style={{ "--piece-index": index }}>{piece}</span>
            ))}
          </div>
          <div className="move-feed">
            <strong>e4</strong>
            <strong>c5</strong>
            <strong>Nf3</strong>
          </div>
        </div>
        <div className="tournaments-sidebar-stats tournaments-stats-animate">
          <div className="tournaments-stat-pill">
            <Trophy size={16} />
            <span>{tournaments.length}</span>
            <small>{labels.events}</small>
          </div>
          <div className="tournaments-stat-pill">
            <span>{tournaments.filter((t) => t.status === "active").length}</span>
            <small>{labels.active}</small>
          </div>
          <div className="tournaments-stat-pill">
            <span>{tournaments.filter((t) => t.status === "upcoming").length}</span>
            <small>{labels.upcoming}</small>
          </div>
        </div>
      </aside>
    </div>
  );
}
