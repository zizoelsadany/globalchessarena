import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldAlert, Users, Flag, Bell, Trophy, Eye } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchAdminDashboard, banUser, unbanUser, deleteUser, resolveReport, broadcastNotification, resetSiteVisits, deleteMatch } from "../services/admin.js";

export default function AdminDashboard() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [notificationText, setNotificationText] = useState("");

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من رغبتك في حذف هذه المباراة؟" : "Are you sure you want to delete this match?")) {
      return;
    }
    try {
      await deleteMatch(matchId);
      await refreshDashboard();
      toast.success(lang === "ar" ? "تم حذف المباراة بنجاح" : "Match deleted successfully");
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchAdminDashboard()
      .then((data) => setDashboard(data))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel"><p>{lang === "ar" ? "جار تحميل لوحة الإدارة..." : "Loading admin dashboard..."}</p></div>;
  if (!dashboard) return null;

  const refreshDashboard = async () => {
    const refreshed = await fetchAdminDashboard();
    setDashboard(refreshed);
  };

  const handleUserAction = async (action, userId) => {
    try {
      if (action === "ban") await banUser(userId);
      if (action === "unban") await unbanUser(userId);
      if (action === "delete") await deleteUser(userId);
      await refreshDashboard();
      toast.success(lang === "ar" ? "تم التنفيذ" : "Action completed");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      await resolveReport(reportId, "resolved");
      await refreshDashboard();
      toast.success(lang === "ar" ? "تم حل التقرير" : "Report resolved");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSendNotification = async () => {
    try {
      await broadcastNotification(notificationText);
      setNotificationText("");
      await refreshDashboard();
      toast.success(lang === "ar" ? "تم إرسال الإشعار" : "Notification sent");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const adminCards = [
    {
      key: "users",
      title: lang === "ar" ? "المستخدمون" : "Users",
      description: lang === "ar" ? "افتح صفحة مستخدمين منفصلة لإدارة الحسابات." : "Open a separate users page to manage accounts.",
      to: "/admin/users"
    },
    {
      key: "reports",
      title: lang === "ar" ? "التقارير" : "Reports",
      description: lang === "ar" ? "افتح صفحة التقارير لمعالجة البلاغات واحدة تلو الأخرى." : "Open the reports page to handle reports one by one.",
      to: "/admin/reports"
    },
    {
      key: "notifications",
      title: lang === "ar" ? "الإشعارات" : "Notifications",
      description: lang === "ar" ? "افتح صفحة الإشعارات لإرسال رسائل واضحة." : "Open the notifications page to send clear messages.",
      to: "/admin/notifications"
    },
    {
      key: "tournaments",
      title: lang === "ar" ? "البطولات" : "Tournaments",
      description: lang === "ar" ? "افتح صفحة البطولات لإدارة المسابقة وجدولة المباريات." : "Open the tournaments page to manage events and match scheduling.",
      to: "/admin/tournaments"
    },
    {
      key: "analyses",
      title: lang === "ar" ? "التحليلات" : "Analyses",
      description: lang === "ar" ? "عرض وحذف طلبات تحليل المباريات التي تمت بواسطة المستخدمين." : "View and delete game analysis requests triggered by users.",
      to: "/admin/analyses"
    },
    {
      key: "payments",
      title: lang === "ar" ? "الاشتراكات اليدوية" : "Manual Payments",
      description: lang === "ar" ? "مراجعة إيصالات دفع الاشتراكات اليدوية وتفعيل حسابات الأعضاء المميزين." : "Review manual payment screenshots and activate premium memberships.",
      to: "/admin/payments"
    }
  ];

  return (
    <section className="panel admin-dashboard">
      <div className="panel-title"><ShieldAlert size={18} /><h2>{lang === "ar" ? "لوحة تحكم الأدمن" : "Admin Dashboard"}</h2></div>

      <div className="dashboard-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Eye size={18} />
            <strong style={{ fontSize: "1.5rem" }}>{dashboard.siteVisits || 0}</strong>
          </div>
          <span>{lang === "ar" ? "الزيارات" : "Site Visits"}</span>
          <button
            onClick={async () => {
              try {
                await resetSiteVisits();
                setDashboard(prev => ({ ...prev, siteVisits: 0 }));
                toast.success(lang === "ar" ? "تم تصفير الزيارات" : "Visits reset to 0");
              } catch (e) {
                toast.error(e.message);
              }
            }}
            style={{
              marginTop: 4,
              padding: "4px 10px",
              fontSize: "0.75rem",
              background: "var(--danger, #e53)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            {lang === "ar" ? "تصفير" : "Reset"}
          </button>
        </div>
        <div className="stat-card"><Users size={18} /><strong>{dashboard.users.length}</strong><span>{lang === "ar" ? "المستخدمون" : "All users"}</span></div>
        <div className="stat-card"><Flag size={18} /><strong>{dashboard.matches.length}</strong><span>{lang === "ar" ? "المباريات" : "All matches"}</span></div>
        <div className="stat-card"><Bell size={18} /><strong>{dashboard.openReportCount}</strong><span>{lang === "ar" ? "التقارير المفتوحة" : "Open reports"}</span></div>
        <div className="stat-card"><Trophy size={18} /><strong>{dashboard.tournaments.length}</strong><span>{lang === "ar" ? "البطولات" : "Tournaments"}</span></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        {adminCards.map((card) => (
          <div key={card.key} className="panel admin-panel" style={{ minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h3>{card.title}</h3>
              <p style={{ marginTop: 12, color: "var(--muted)", lineHeight: 1.6 }}>{card.description}</p>
            </div>
            <Link to={card.to} className="primary as-link" style={{ alignSelf: "flex-start", marginTop: 16 }}>
              {lang === "ar" ? "افتح الصفحة" : "Open page"}
            </Link>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h3>{lang === "ar" ? "أحدث المباريات والنتائج" : "Recent Matches & Results"}</h3>
        <div className="table-responsive" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === "ar" ? "الأبيض" : "White"}</th>
                <th>{lang === "ar" ? "الأسود" : "Black"}</th>
                <th>{lang === "ar" ? "النتيجة" : "Result"}</th>
                <th>{lang === "ar" ? "الفائز" : "Winner"}</th>
                <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.matches.slice(0, 10).map((match) => (
                <tr key={match.id}>
                  <td>#{match.id}</td>
                  <td>{match.white_username}</td>
                  <td>{match.black_username}</td>
                  <td>
                    <span className={`status-badge ${match.result ? "resolved" : "open"}`}>
                      {match.result ? match.result.replace("_", " ") : (lang === "ar" ? "جارية" : "Ongoing")}
                    </span>
                  </td>
                  <td>{match.winner_username || "-"}</td>
                  <td>
                    <button
                      className="danger-btn"
                      onClick={() => handleDeleteMatch(match.id)}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", minHeight: "auto" }}
                    >
                      {lang === "ar" ? "حذف" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {dashboard.matches.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "1rem" }}>
                    {lang === "ar" ? "لا توجد مباريات بعد" : "No matches yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
