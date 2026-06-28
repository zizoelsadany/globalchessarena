import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, Users, Crown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchAllUsers, banUser, unbanUser, deleteUser, toggleUserPremium } from "../services/admin.js";

export default function AdminUsers() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchAllUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    const data = await fetchAllUsers();
    setUsers(Array.isArray(data) ? data : []);
  };

  const handleUserAction = async (action, userId) => {
    try {
      if (action === "ban") await banUser(userId);
      if (action === "unban") await unbanUser(userId);
      if (action === "delete") await deleteUser(userId);
      await refresh();
      toast.success(lang === "ar" ? "تم التحديث" : "Updated");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) return <div className="panel"><p>{lang === "ar" ? "جار تحميل المستخدمين..." : "Loading users..."}</p></div>;

  return (
    <section className="panel admin-dashboard">
      <div className="panel-title"><ShieldAlert size={18} /><h2>{lang === "ar" ? "صفحة إدارة المستخدمين" : "Users Management"}</h2></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{lang === "ar" ? "اسم المستخدم" : "Username"}</th>
              <th>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</th>
              <th>{lang === "ar" ? "الحالة" : "Status"}</th>
              <th>{lang === "ar" ? "العضوية" : "Membership"}</th>
              <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`status-badge ${user.status === "active" ? "resolved" : "cancelled"}`}>
                    {user.status === "active" ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "محظور" : "Banned")}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.is_premium === 1 ? "resolved" : "open"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {user.is_premium === 1 && <Crown size={12} style={{ color: "var(--accent)" }} />}
                    {user.is_premium === 1 ? (lang === "ar" ? "مميز" : "Premium") : (lang === "ar" ? "عادي" : "Normal")}
                  </span>
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    className="primary" 
                    type="button" 
                    onClick={() => handleUserAction(user.status === "active" ? "ban" : "unban", user.id)}
                    style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  >
                    {user.status === "active" ? (lang === "ar" ? "حظر" : "Ban") : (lang === "ar" ? "رفع الحظر" : "Unban")}
                  </button>
                  <button 
                    className="hero-btn hero-btn-primary" 
                    type="button" 
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.85rem",
                      minHeight: "auto",
                      background: user.is_premium === 1 ? "rgba(255,255,255,0.05)" : "var(--accent)",
                      border: user.is_premium === 1 ? "1px solid var(--line)" : "none"
                    }}
                    onClick={async () => {
                      try {
                        await toggleUserPremium(user.id);
                        await refresh();
                        toast.success(lang === "ar" ? "تم تحديث العضوية بنجاح!" : "Membership status updated successfully!");
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                  >
                    {user.is_premium === 1 ? (lang === "ar" ? "إلغاء المميز" : "Revoke Premium") : (lang === "ar" ? "ترقية لمميز" : "Grant Premium")}
                  </button>
                  <button 
                    className="danger-btn" 
                    type="button" 
                    onClick={() => handleUserAction("delete", user.id)}
                    style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  >
                    {lang === "ar" ? "حذف" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
