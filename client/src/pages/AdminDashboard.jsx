import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, Users, Flag, Bell, Trophy } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchAdminDashboard, banUser, unbanUser, deleteUser, resolveReport, createNotification, createTournament } from "../services/admin.js";

export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [notificationText, setNotificationText] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");

  useEffect(() => {
    fetchAdminDashboard()
      .then((data) => setDashboard(data))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel"><p>{lang === "ar" ? "جارٍ تحميل لوحة الإدارة..." : "Loading admin dashboard..."}</p></div>;
  if (!dashboard) return null;

  const handleUserAction = async (action, userId) => {
    try {
      if (action === "ban") await banUser(userId);
      if (action === "unban") await unbanUser(userId);
      if (action === "delete") await deleteUser(userId);
      const refreshed = await fetchAdminDashboard();
      setDashboard(refreshed);
      toast.success(lang === "ar" ? "تم التنفيذ" : "Action completed");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      await resolveReport(reportId, "resolved");
      const refreshed = await fetchAdminDashboard();
      setDashboard(refreshed);
      toast.success(lang === "ar" ? "تم حل التقرير" : "Report resolved");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSendNotification = async () => {
    try {
      await createNotification(notificationText);
      setNotificationText("");
      const refreshed = await fetchAdminDashboard();
      setDashboard(refreshed);
      toast.success(lang === "ar" ? "تم إرسال الإشعار" : "Notification sent");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCreateTournament = async () => {
    try {
      await createTournament({ name: tournamentName, description: tournamentDescription, status: "upcoming" });
      setTournamentName("");
      setTournamentDescription("");
      const refreshed = await fetchAdminDashboard();
      setDashboard(refreshed);
      toast.success(lang === "ar" ? "تم إنشاء البطولة" : "Tournament created");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="panel admin-dashboard">
      <div className="panel-title"><ShieldAlert size={18} /><h2>{lang === "ar" ? "لوحة تحكم الأدمن" : "Admin Dashboard"}</h2></div>
      <div className="dashboard-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div className="stat-card"><Users size={18} /><strong>{dashboard.users.length}</strong><span>{lang === "ar" ? "المستخدمون" : "All users"}</span></div>
        <div className="stat-card"><Flag size={18} /><strong>{dashboard.matches.length}</strong><span>{lang === "ar" ? "المباريات" : "All matches"}</span></div>
        <div className="stat-card"><Bell size={18} /><strong>{dashboard.openReportCount}</strong><span>{lang === "ar" ? "التقارير المفتوحة" : "Open reports"}</span></div>
        <div className="stat-card"><Trophy size={18} /><strong>{dashboard.tournaments.length}</strong><span>{lang === "ar" ? "البطولات" : "Tournaments"}</span></div>
      </div>

      <div className="admin-panel-grid" style={{ display: "grid", gap: 20 }}>
        <div className="panel admin-panel">
          <h3>{lang === "ar" ? "المستخدمون" : "Users"}</h3>
          <div className="table-wrap"><table><thead><tr><th>{lang === "ar" ? "اسم المستخدم" : "Username"}</th><th>{lang === "ar" ? "البريد" : "Email"}</th><th>{lang === "ar" ? "الحالة" : "Status"}</th><th>{lang === "ar" ? "إجراءات" : "Actions"}</th></tr></thead><tbody>{dashboard.users.map((player) => (<tr key={player.id}><td>{player.username}</td><td>{player.email}</td><td>{player.status}</td><td style={{ display: "flex", gap: 6 }}><button className="primary" type="button" onClick={() => handleUserAction(player.status === "active" ? "ban" : "unban", player.id)}>{player.status === "active" ? (lang === "ar" ? "حظر" : "Ban") : (lang === "ar" ? "رفع الحظر" : "Unban")}</button><button className="danger-btn" type="button" onClick={() => handleUserAction("delete", player.id)}>{lang === "ar" ? "حذف" : "Delete"}</button></td></tr>))}</tbody></table></div>
        </div>

        <div className="panel admin-panel">
          <h3>{lang === "ar" ? "التقارير" : "Reports"}</h3>
          <div className="table-wrap"><table><thead><tr><th>{lang === "ar" ? "المبلغ" : "Reporter"}</th><th>{lang === "ar" ? "المبلغ عنه" : "Reported"}</th><th>{lang === "ar" ? "النوع" : "Type"}</th><th>{lang === "ar" ? "الرسالة" : "Message"}</th><th>{lang === "ar" ? "إجراءات" : "Actions"}</th></tr></thead><tbody>{dashboard.reports.map((report) => (<tr key={report.id}><td>{report.reporter_username}</td><td>{report.reported_username || "-"}</td><td>{report.type}</td><td>{report.message}</td><td><button className="primary" type="button" onClick={() => handleResolveReport(report.id)}>{lang === "ar" ? "حل" : "Resolve"}</button></td></tr>))}</tbody></table></div>
        </div>

        <div className="panel admin-panel">
          <h3>{lang === "ar" ? "إرسال إشعار" : "Send notification"}</h3>
          <textarea value={notificationText} onChange={(event) => setNotificationText(event.target.value)} placeholder={lang === "ar" ? "نص الإشعار" : "Notification message"} rows={4} style={{ width: "100%", borderRadius: 10, padding: 12, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }} />
          <button className="primary" type="button" onClick={handleSendNotification} style={{ marginTop: 12 }}>{lang === "ar" ? "إرسال" : "Send"}</button>
        </div>

        <div className="panel admin-panel">
          <h3>{lang === "ar" ? "إدارة البطولات" : "Manage tournaments"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="text" placeholder={lang === "ar" ? "اسم البطولة" : "Tournament name"} value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} style={{ padding: 10, borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)", fontSize: 14 }} />
            <textarea placeholder={lang === "ar" ? "وصف البطولة" : "Tournament description"} value={tournamentDescription} onChange={(event) => setTournamentDescription(event.target.value)} rows={3} style={{ padding: 10, borderRadius: 6, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)", fontSize: 14, resize: "none", fontFamily: "inherit" }} />
            <button className="primary" type="button" onClick={handleCreateTournament}>{lang === "ar" ? "إنشاء بطولة" : "Create tournament"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
