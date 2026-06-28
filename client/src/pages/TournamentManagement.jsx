import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Trophy } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { normalizeAssetUrl } from "../services/api.js";
import { fetchAdminDashboard, createTournament, updateTournament, deleteTournament, createTournamentMatch } from "../services/admin.js";
import { fetchTournamentParticipants, fetchTournamentMatches } from "../services/tournaments.js";

export default function TournamentManagement() {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [selectedTournamentForMatch, setSelectedTournamentForMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const { socket } = useSocket();
  const [startingMatch, setStartingMatch] = useState(null);
  
  // Tournament form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [maxParticipants, setMaxParticipants] = useState(64);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreviewSrc, setLogoPreviewSrc] = useState("");
  const [styleColor, setStyleColor] = useState("#7cc96f");
  const [endsAt, setEndsAt] = useState("");

  // Match form
  const [whitePlayerId, setWhitePlayerId] = useState("");
  const [blackPlayerId, setBlackPlayerId] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    fetchAdminDashboard()
      .then((data) => setDashboard(data))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const refreshDashboard = async () => {
    const data = await fetchAdminDashboard();
    setDashboard(data);
  };

  const loadTournamentData = async (tournamentId) => {
    try {
      const [participantsData, matchesData] = await Promise.all([
        fetchTournamentParticipants(tournamentId),
        fetchTournamentMatches(tournamentId)
      ]);
      setParticipants(Array.isArray(participantsData) ? participantsData : []);
      setMatches(Array.isArray(matchesData) ? matchesData : []);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setSelectedTournamentId(null);
    setName("");
    setDescription("");
    setStatus("upcoming");
    setMaxParticipants(64);
    setLogoFile(null);
    setLogoUrl("");
    setLogoPreviewSrc("");
    setStyleColor("#7cc96f");
    setEndsAt("");
  };

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewSrc(normalizeAssetUrl(logoUrl));
      return undefined;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile, logoUrl]);

  const resetMatchForm = () => {
    setWhitePlayerId("");
    setBlackPlayerId("");
    setScheduledTime("");
    setShowMatchForm(false);
  };

  const handleSaveTournament = async () => {
    try {
      if (!name.trim()) {
        toast.error(lang === "ar" ? "أدخل اسم البطولة" : "Enter tournament name");
        return;
      }

      const payload = new FormData();
      payload.append("name", name);
      payload.append("description", description);
      payload.append("status", status);
      payload.append("max_participants", String(maxParticipants));
      payload.append("style_color", styleColor);
      payload.append("ends_at", endsAt || "");
      if (logoFile) {
        payload.append("logo", logoFile);
      } else if (logoUrl) {
        payload.append("logo_url", logoUrl);
      }

      if (selectedTournamentId) {
        await updateTournament(selectedTournamentId, payload);
        toast.success(lang === "ar" ? "تم تحديث البطولة" : "Tournament updated");
      } else {
        await createTournament(payload);
        toast.success(lang === "ar" ? "تم إنشاء البطولة" : "Tournament created");
      }

      await refreshDashboard();
      resetForm();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleScheduleMatch = async () => {
    try {
      if (!whitePlayerId || !blackPlayerId) {
        toast.error(lang === "ar" ? "اختر لاعبين" : "Select players");
        return;
      }
      if (whitePlayerId === blackPlayerId) {
        toast.error(lang === "ar" ? "يجب اختيار لاعبين مختلفين" : "Players must be different");
        return;
      }

      await createTournamentMatch(selectedTournamentForMatch, {
        whitePlayerId: Number(whitePlayerId),
        blackPlayerId: Number(blackPlayerId),
        scheduledTime: scheduledTime || null
      });

      toast.success(lang === "ar" ? "تم جدولة المباراة" : "Match scheduled");
      await loadTournamentData(selectedTournamentForMatch);
      resetMatchForm();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleEditTournament = (tournament) => {
    setSelectedTournamentId(tournament.id);
    setName(tournament.name || "");
    setDescription(tournament.description || "");
    setStatus(tournament.status || "upcoming");
    setMaxParticipants(tournament.max_participants || 64);
    setLogoFile(null);
    setLogoUrl(tournament.logo_url || "");
    setStyleColor(tournament.style_color || "#7cc96f");
    setEndsAt(tournament.ends_at ? tournament.ends_at.slice(0, 16) : "");
  };

  const handleSelectTournamentForMatch = (tournamentId) => {
    setSelectedTournamentForMatch(tournamentId);
    loadTournamentData(tournamentId);
  };

  const handleDeleteTournament = async (tournamentId) => {
    try {
      await deleteTournament(tournamentId);
      toast.success(lang === "ar" ? "تم حذف البطولة" : "Tournament deleted");
      await refreshDashboard();
      if (selectedTournamentId === tournamentId) resetForm();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStartTournamentMatch = async (matchId) => {
    if (!socket) {
      toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected");
      return;
    }
    setStartingMatch(matchId);
    socket.emit("startTournamentMatch", { matchId });
    setTimeout(() => {
      setStartingMatch((current) => (current === matchId ? null : current));
    }, 5000);
  };

  if (loading) {
    return <div className="panel"><p>{lang === "ar" ? "جارٍ تحميل إدارة البطولات..." : "Loading tournament management..."}</p></div>;
  }

  return (
    <section className="panel admin-dashboard">
      <div className="panel-title">
        <Trophy size={18} />
        <div>
          <h2>{t("tournamentManagement")}</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            {lang === "ar"
              ? "أنشئ وعدل بطولات اللعبة من هنا"
              : "Create and update tournaments from here."}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {/* Create/Edit Tournament Form */}
        <div className="panel admin-panel admin-tournament-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <h3>{lang === "ar" ? "إنشاء/تعديل بطولة" : "Create/Edit Tournament"}</h3>
            <Link to="/admin" className="secondary as-link">
              {lang === "ar" ? "العودة للأدمن" : "Back to admin"}
            </Link>
          </div>

          <div className="form-grid">
            <input type="text" placeholder={lang === "ar" ? "اسم البطولة" : "Tournament name"} value={name} onChange={(event) => setName(event.target.value)} />
            <textarea placeholder={lang === "ar" ? "وصف البطولة" : "Tournament description"} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            <div className="field-row">
              <label>{lang === "ar" ? "نوع البطولة" : "Status"}</label>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="upcoming">{lang === "ar" ? "قادمة" : "Upcoming"}</option>
                <option value="active">{lang === "ar" ? "نشطة" : "Active"}</option>
                <option value="completed">{lang === "ar" ? "مكتملة" : "Completed"}</option>
                <option value="cancelled">{lang === "ar" ? "ملغاة" : "Cancelled"}</option>
              </select>
            </div>
            <div className="field-row">
              <label>{lang === "ar" ? "أقصى عدد لاعبين" : "Max participants"}</label>
              <input type="number" min="2" max="1024" value={maxParticipants} onChange={(event) => setMaxParticipants(Number(event.target.value))} />
            </div>
            <div className="field-row">
              <label>{lang === "ar" ? "شعار البطولة" : "Tournament logo"}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && !file.type.startsWith("image/")) {
                    toast.error(lang === "ar" ? "اختار ملف صورة فقط" : "Please choose an image file");
                    event.target.value = "";
                    setLogoFile(null);
                    return;
                  }
                  setLogoFile(file);
                  if (!file) return;
                }}
              />
            </div>
            {(logoFile || logoUrl) && (
              <div className="logo-preview">
                <img
                  src={logoPreviewSrc}
                  alt="Logo preview"
                />
                <small>
                  {logoFile
                    ? lang === "ar"
                      ? "معاينة الشعار الجديد"
                      : "New logo preview"
                    : lang === "ar"
                    ? "الشعار الحالي"
                    : "Current logo"}
                </small>
              </div>
            )}
            <div className="field-row">
              <label>{lang === "ar" ? "لون البطولة" : "Style color"}</label>
              <input type="color" value={styleColor} onChange={(event) => setStyleColor(event.target.value)} style={{ width: 48, height: 38, padding: 0, border: "none", background: "transparent" }} />
            </div>
            <div className="field-row">
              <label>{lang === "ar" ? "تنتهي في" : "Ends at"}</label>
              <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <button className="primary" type="button" onClick={handleSaveTournament}>
              {selectedTournamentId ? (lang === "ar" ? "تحديث البطولة" : "Update tournament") : (lang === "ar" ? "إنشاء بطولة" : "Create tournament")}
            </button>
            {selectedTournamentId && (
              <button className="danger-btn" type="button" onClick={() => handleDeleteTournament(selectedTournamentId)}>
                {lang === "ar" ? "حذف البطولة" : "Delete tournament"}
              </button>
            )}
            {selectedTournamentId && (
              <button className="secondary" type="button" onClick={resetForm}>
                {lang === "ar" ? "إلغاء" : "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Tournaments List */}
        <div className="panel admin-panel">
          <h3>{lang === "ar" ? "البطولات الحالية" : "Current tournaments"}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{lang === "ar" ? "الاسم" : "Name"}</th>
                  <th>{lang === "ar" ? "الحالة" : "Status"}</th>
                  <th>{lang === "ar" ? "عدد المشتركين" : "Players"}</th>
                  <th>{lang === "ar" ? "ينتهي" : "Ends"}</th>
                  <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.tournaments || []).map((tournament) => (
                  <tr key={tournament.id}>
                    <td>{tournament.name}</td>
                    <td>{tournament.status}</td>
                    <td>{tournament.participant_count ?? 0}/{tournament.max_participants ?? 64}</td>
                    <td>{tournament.ends_at ? new Date(tournament.ends_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US") : "-"}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: "0.9rem" }}>
                      <button className="primary" type="button" onClick={() => handleEditTournament(tournament)}>
                        {lang === "ar" ? "تعديل" : "Edit"}
                      </button>
                      <button className="primary" type="button" onClick={() => handleSelectTournamentForMatch(tournament.id)}>
                        {lang === "ar" ? "مباريات" : "Matches"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tournament Participants & Matches */}
        {selectedTournamentForMatch && (
          <>
            <div className="panel admin-panel">
              <h3>{lang === "ar" ? "مشاركو البطولة" : "Tournament Participants"}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{lang === "ar" ? "الاسم" : "Name"}</th>
                      <th>{lang === "ar" ? "تصنيف إيلو" : "Elo Rating"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: "center", color: "var(--muted)" }}>
                          {lang === "ar" ? "لا يوجد مشاركون" : "No participants"}
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => (
                        <tr key={p.id}>
                          <td>{p.username}</td>
                          <td>{p.elo_rating || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Schedule Match Form */}
            {participants.length >= 2 && (
              <div className="panel admin-panel admin-tournament-panel">
                <h3 style={{ marginBottom: 16 }}>
                  {lang === "ar" ? "جدولة مباراة جديدة" : "Schedule New Match"}
                </h3>
                {!showMatchForm ? (
                  <button className="primary" type="button" onClick={() => setShowMatchForm(true)}>
                    {lang === "ar" ? "جدولة مباراة" : "Schedule Match"}
                  </button>
                ) : (
                  <div className="form-grid">
                    <div className="field-row">
                      <label>{lang === "ar" ? "لاعب الأبيض" : "White Player"}</label>
                      <select value={whitePlayerId} onChange={(e) => setWhitePlayerId(e.target.value)}>
                        <option value="">{lang === "ar" ? "اختر لاعب" : "Select player"}</option>
                        {participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.username} ({p.elo_rating || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-row">
                      <label>{lang === "ar" ? "لاعب الأسود" : "Black Player"}</label>
                      <select value={blackPlayerId} onChange={(e) => setBlackPlayerId(e.target.value)}>
                        <option value="">{lang === "ar" ? "اختر لاعب" : "Select player"}</option>
                        {participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.username} ({p.elo_rating || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-row">
                      <label>{lang === "ar" ? "المعاد المجدول" : "Scheduled Time"}</label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="primary" type="button" onClick={handleScheduleMatch}>
                        {lang === "ar" ? "جدولة" : "Schedule"}
                      </button>
                      <button className="secondary" type="button" onClick={resetMatchForm}>
                        {lang === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matches Table */}
            <div className="panel admin-panel">
              <h3>{lang === "ar" ? "مباريات البطولة" : "Tournament Matches"}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{lang === "ar" ? "الأبيض" : "White"}</th>
                      <th>{lang === "ar" ? "الأسود" : "Black"}</th>
                      <th>{lang === "ar" ? "المعاد" : "Scheduled"}</th>
                      <th>{lang === "ar" ? "النتيجة" : "Result"}</th>
                      <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", color: "var(--muted)" }}>
                          {lang === "ar" ? "لا توجد مباريات" : "No matches"}
                        </td>
                      </tr>
                    ) : (
                      matches.map((match) => (
                        <tr key={match.id}>
                          <td>{match.white_username} ({match.white_elo})</td>
                          <td>{match.black_username} ({match.black_elo})</td>
                          <td>
                            {match.scheduled_time
                              ? new Date(match.scheduled_time).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")
                              : lang === "ar" ? "لم يتم تحديده" : "Not scheduled"}
                          </td>
                          <td>{match.winner_username ? `${match.winner_username} won` : lang === "ar" ? "قيد اللعب" : "In progress"}</td>
                          <td>
                            {!match.winner_username ? (
                              <button
                                className="primary as-link"
                                type="button"
                                disabled={startingMatch === match.id}
                                onClick={() => handleStartTournamentMatch(match.id)}
                                style={{ fontSize: "0.9rem", padding: "8px 10px" }}
                              >
                                {startingMatch === match.id
                                  ? (lang === "ar" ? "جارٍ الإعداد..." : "Starting...")
                                  : (lang === "ar" ? "ابدأ المباراة" : "Start match")}
                              </button>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
