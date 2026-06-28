import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Calendar, CheckCircle2, ChevronLeft, Clock, Play, Shield, Trophy, UserCheck, Users } from "lucide-react";
import { normalizeAssetUrl } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import {
  fetchTournamentDetails,
  fetchTournamentMatches,
  fetchTournamentParticipants,
  joinTournament
} from "../services/tournaments.js";

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { socket, onlinePlayers } = useSocket();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [joining, setJoining] = useState(false);
  const [startingMatch, setStartingMatch] = useState(null);

  const labels = useMemo(
    () => ({
      back: lang === "ar" ? "العودة" : "Back",
      loading: lang === "ar" ? "جار التحميل..." : "Loading...",
      notFound: lang === "ar" ? "البطولة غير موجودة" : "Tournament not found",
      tournament: lang === "ar" ? "بطولة" : "Tournament",
      noDescription: lang === "ar" ? "بطولة مباشرة بنظام تسجيل وجدولة مباريات." : "A live tournament with registration and scheduled matches.",
      status: lang === "ar" ? "الحالة" : "Status",
      participants: lang === "ar" ? "المشاركون" : "Participants",
      ends: lang === "ar" ? "تنتهي" : "Ends",
      joined: lang === "ar" ? "أنت داخل البطولة" : "You are in",
      join: lang === "ar" ? "انضم للبطولة" : "Join tournament",
      joining: lang === "ar" ? "جار الانضمام..." : "Joining...",
      full: lang === "ar" ? "البطولة ممتلئة" : "Tournament full",
      nextMatch: lang === "ar" ? "مباراتك في البطولة" : "Your tournament match",
      noMatch: lang === "ar" ? "لم يتم جدولة مباراة لك بعد" : "No match scheduled for you yet",
      noMatchCopy:
        lang === "ar"
          ? "بعد ما الأدمن يضيف مباراة، هتظهر هنا وتقدر تدخلها من نفس الصفحة."
          : "When the admin schedules your match, it will appear here with an enter button.",
      white: lang === "ar" ? "الأبيض" : "White",
      black: lang === "ar" ? "الأسود" : "Black",
      opponentOnline: lang === "ar" ? "الخصم متصل" : "Opponent online",
      opponentOffline: lang === "ar" ? "الخصم غير متصل" : "Opponent offline",
      enterMatch: lang === "ar" ? "ادخل المباراة" : "Enter match",
      waiting: lang === "ar" ? "جار الإعداد..." : "Starting...",
      players: lang === "ar" ? "قائمة اللاعبين" : "Players list",
      elo: lang === "ar" ? "تصنيف Elo" : "Elo rating",
      joinedAt: lang === "ar" ? "وقت الانضمام" : "Joined",
      matches: lang === "ar" ? "جدول المباريات" : "Match schedule",
      scheduled: lang === "ar" ? "المعاد" : "Scheduled",
      result: lang === "ar" ? "النتيجة" : "Result",
      inProgress: lang === "ar" ? "قيد اللعب" : "In progress",
      notScheduled: lang === "ar" ? "لم يحدد" : "Not scheduled",
      noParticipants: lang === "ar" ? "لا يوجد مشاركون حتى الآن" : "No participants yet",
      noMatches: lang === "ar" ? "لا توجد مباريات مجدولة بعد" : "No matches scheduled yet",
      active: lang === "ar" ? "نشطة" : "Active",
      upcoming: lang === "ar" ? "قادمة" : "Upcoming",
      completed: lang === "ar" ? "مكتملة" : "Completed",
      cancelled: lang === "ar" ? "ملغاة" : "Cancelled"
    }),
    [lang]
  );

  const [readyState, setReadyState] = useState(null); // { whiteReady, blackReady, timerStarted }
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [now, setNow] = useState(Date.now());

  const isUserMatchPlayer = (match) => match.white_player === user?.id || match.black_player === user?.id;
  const getOpponent = (match) => {
    if (!user) return null;
    return match.white_player === user.id
      ? { id: match.black_player, username: match.black_username, elo: match.black_elo }
      : { id: match.white_player, username: match.white_username, elo: match.white_elo };
  };
  const isPlayerOnline = (playerId) => onlinePlayers.some((item) => item.id === playerId);
  const myMatches = matches.filter(isUserMatchPlayer);
  const nextMyMatch = myMatches.find((match) => !match.winner_username) || myMatches[0] || null;
  const opponent = nextMyMatch ? getOpponent(nextMyMatch) : null;
  const opponentOnline = opponent ? isPlayerOnline(opponent.id) : false;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tournamentData, participantsData, matchesData] = await Promise.all([
          fetchTournamentDetails(id),
          fetchTournamentParticipants(id),
          fetchTournamentMatches(id)
        ]);
        setTournament(tournamentData);
        setParticipants(Array.isArray(participantsData) ? participantsData : []);
        setMatches(Array.isArray(matchesData) ? matchesData : []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket || !nextMyMatch) return;

    function onReadyUpdate(data) {
      if (data.matchId === nextMyMatch.id) {
        setReadyState(data);
        if (data.timerStarted) {
          setTimeLeft(300);
        }
      }
    }

    function onForfeit(data) {
      if (data.matchId === nextMyMatch.id) {
        toast.success(lang === "ar" ? "انتهت المباراة لعدم حضور أحد اللاعبين" : "Match ended by forfeit");
        setTimeout(() => window.location.reload(), 1500);
      }
    }

    function onCancelled(data) {
      if (data.matchId === nextMyMatch.id) {
        toast.error(lang === "ar" ? "تم إلغاء المباراة لعدم الحضور" : "Match cancelled due to no-show");
        setTimeout(() => window.location.reload(), 1500);
      }
    }

    function onUpdated() {
      window.location.reload();
    }

    socket.on("tournamentReadyUpdate", onReadyUpdate);
    socket.on("tournamentMatchForfeit", onForfeit);
    socket.on("tournamentMatchCancelled", onCancelled);
    socket.on("tournamentMatchUpdated", onUpdated);

    return () => {
      socket.off("tournamentReadyUpdate", onReadyUpdate);
      socket.off("tournamentMatchForfeit", onForfeit);
      socket.off("tournamentMatchCancelled", onCancelled);
      socket.off("tournamentMatchUpdated", onUpdated);
    };
  }, [socket, nextMyMatch, lang]);

  useEffect(() => {
    if (!readyState?.timerStarted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [readyState?.timerStarted]);

  if (loading) return <div className="panel"><p>{labels.loading}</p></div>;
  if (!tournament) return <div className="panel"><p>{labels.notFound}</p></div>;

  const handleJoin = async () => {
    try {
      setJoining(true);
      const { tournament: joinedTournament } = await joinTournament(id);
      toast.success(lang === "ar" ? "تم الانضمام للبطولة" : "Joined tournament");
      setTournament(joinedTournament);
      const updatedParticipants = await fetchTournamentParticipants(id);
      setParticipants(Array.isArray(updatedParticipants) ? updatedParticipants : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (value, withTime = false) =>
    value
      ? new Date(value).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
        })
      : labels.notScheduled;

  const hasJoined = Boolean(tournament.joined);
  const isFull = tournament.participant_count >= tournament.max_participants;
  const fillPercentage = Math.min(
    100,
    Math.round(((tournament.participant_count ?? 0) / (tournament.max_participants ?? 64)) * 100)
  );

  const isMatchTimeStarted = nextMyMatch?.scheduled_time
    ? new Date(nextMyMatch.scheduled_time).getTime() <= now
    : true;

  const timeUntilStart = nextMyMatch?.scheduled_time
    ? new Date(nextMyMatch.scheduled_time).getTime() - now
    : 0;

  const formatCountdown = (ms) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleStartTournamentMatch = async (matchId) => {
    if (!socket) return toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected");
    setStartingMatch(matchId);
    socket.emit("startTournamentMatch", { matchId });
    setTimeout(() => {
      setStartingMatch((current) => (current === matchId ? null : current));
    }, 5000);
  };

  return (
    <div className="tournament-detail-page">
      <button className="secondary as-link tournament-back-link" type="button" onClick={() => navigate(-1)}>
        <ChevronLeft size={16} />
        {labels.back}
      </button>

      <section className="panel tournament-detail-hero" style={{ "--tournament-accent": tournament.style_color || "#2f6fed" }}>
        <div className="tournament-detail-copy">
          <span className="tournament-kicker">
            <Trophy size={15} />
            {labels.tournament}
          </span>
          <h2>{tournament.name}</h2>
          <p>{tournament.description || labels.noDescription}</p>

          <div className="tournament-detail-metrics">
            <div>
              <Shield size={17} />
              <span>{labels.status}</span>
              <strong>{labels[tournament.status] || tournament.status}</strong>
            </div>
            <div>
              <Users size={17} />
              <span>{labels.participants}</span>
              <strong>{tournament.participant_count}/{tournament.max_participants}</strong>
            </div>
            <div>
              <Calendar size={17} />
              <span>{labels.ends}</span>
              <strong>{formatDate(tournament.ends_at)}</strong>
            </div>
          </div>

          <div className="tournament-progress">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${fillPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="tournament-join-panel">
          <div className="tournament-detail-logo">
            {tournament.logo_url ? (
              <img src={normalizeAssetUrl(tournament.logo_url)} alt={tournament.name} />
            ) : (
              <Trophy size={48} />
            )}
          </div>
          {hasJoined ? (
            <div className="joined-tournament-note large">
              <CheckCircle2 size={19} />
              <span>{labels.joined}</span>
            </div>
          ) : isFull ? (
            <div className="tournament-full-note">{labels.full}</div>
          ) : (
            <button className="primary" type="button" onClick={handleJoin} disabled={joining}>
              {joining ? labels.joining : labels.join}
            </button>
          )}
        </div>
      </section>

      <section className="panel tournament-player-match">
        <div className="panel-title">
          <Clock size={18} />
          <h3>{labels.nextMatch}</h3>
        </div>
        {nextMyMatch ? (
          <div className="my-match-card">
            <div>
              <span className="eyebrow">{nextMyMatch.white_player === user?.id ? labels.white : labels.black}</span>
              <h3>{opponent?.username || "-"}</h3>
              <p>
                {formatDate(nextMyMatch.scheduled_time, true)}
                {" · "}
                {opponentOnline ? labels.opponentOnline : labels.opponentOffline}
              </p>
              
              {!isMatchTimeStarted && (
                <div style={{ marginTop: 8, color: "var(--accent)", fontWeight: "bold" }}>
                  {lang === "ar" ? "لم تبدأ بعد (تبدأ خلال " : "Not started yet (starts in "}
                  {formatCountdown(timeUntilStart)})
                </div>
              )}

              {isMatchTimeStarted && readyState?.timerStarted && (
                <div style={{ marginTop: 8, color: "#f39c12", fontWeight: "bold" }}>
                  {((nextMyMatch.white_player === user?.id && readyState.whiteReady) ||
                    (nextMyMatch.black_player === user?.id && readyState.blackReady)) ? (
                    lang === "ar" 
                      ? `في انتظار الخصم... (${formatTime(timeLeft)})` 
                      : `Waiting for opponent... (${formatTime(timeLeft)})`
                  ) : (
                    lang === "ar" 
                      ? `الخصم جاهز! ادخل الآن! (${formatTime(timeLeft)})` 
                      : `Opponent is ready! Join now! (${formatTime(timeLeft)})`
                  )}
                </div>
              )}

              {isMatchTimeStarted && readyState && !readyState.timerStarted && (
                <div style={{ marginTop: 8, color: "#2ecc71", fontWeight: "bold" }}>
                  {lang === "ar" ? "جاهز للعب" : "Ready to play"}
                </div>
              )}
            </div>
            
            {!nextMyMatch.winner_username && (
              <button
                className="primary"
                type="button"
                disabled={startingMatch === nextMyMatch.id || !isMatchTimeStarted}
                onClick={() => handleStartTournamentMatch(nextMyMatch.id)}
              >
                <Play size={16} />
                {startingMatch === nextMyMatch.id ? labels.waiting : labels.enterMatch}
              </button>
            )}
          </div>
        ) : (
          <div className="tournament-empty-inline">
            <UserCheck size={22} />
            <div>
              <strong>{labels.noMatch}</strong>
              <p>{labels.noMatchCopy}</p>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <Users size={18} />
          <h3>{labels.players} ({participants.length})</h3>
        </div>
        <div className="tournament-roster-grid">
          {participants.length === 0 ? (
            <div className="tournament-empty-inline">{labels.noParticipants}</div>
          ) : (
            participants.map((participant, index) => (
              <div className="tournament-roster-card" key={participant.id}>
                <span className="rank">#{index + 1}</span>
                <strong>{participant.username}</strong>
                <small>{labels.elo}: {participant.elo_rating || 0}</small>
                <small>{labels.joinedAt}: {formatDate(participant.joined_at)}</small>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Calendar size={18} />
          <h3>{labels.matches}</h3>
        </div>
        <div className="table-wrap tournament-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{labels.white}</th>
                <th>{labels.black}</th>
                <th>{labels.scheduled}</th>
                <th>{labels.result}</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan="4" className="muted-table-cell">{labels.noMatches}</td>
                </tr>
              ) : (
                matches.map((match) => (
                  <tr key={match.id} className={isUserMatchPlayer(match) ? "is-player-row" : ""}>
                    <td>{match.white_username} ({match.white_elo})</td>
                    <td>{match.black_username} ({match.black_elo})</td>
                    <td>{formatDate(match.scheduled_time, true)}</td>
                    <td>{match.winner_username ? `${match.winner_username} ${lang === "ar" ? "فاز" : "won"}` : labels.inProgress}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
