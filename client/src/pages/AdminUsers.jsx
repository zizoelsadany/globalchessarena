import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, Users, Crown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchAllUsers, banUser, unbanUser, deleteUser, toggleUserPremium, distributeCoins, deductCoins } from "../services/admin.js";

export default function AdminUsers() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Coins management modal state
  const [coinsModal, setCoinsModal] = useState({ isOpen: false, user: null, mode: "send" });
  const [coinsAmount, setCoinsAmount] = useState("");

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

  const handleDistributeCoins = async (userId, amount) => {
    try {
      const res = await distributeCoins(userId, amount);
      if (res.success) {
        toast.success(res.message);
        await refresh();
      } else {
        toast.error(res.message || "Failed to transfer coins");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeductCoins = async (userId, amount) => {
    try {
      const res = await deductCoins(userId, amount);
      if (res.success) {
        toast.success(res.message);
        await refresh();
      } else {
        toast.error(res.message || "Failed to withdraw coins");
      }
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
              <th>{lang === "ar" ? "العملات" : "Coins"}</th>
              <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td data-label={lang === "ar" ? "اسم المستخدم" : "Username"}>{user.username}</td>
                <td data-label={lang === "ar" ? "البريد الإلكتروني" : "Email"}>{user.email}</td>
                <td data-label={lang === "ar" ? "الحالة" : "Status"}>
                  <span className={`status-badge ${user.status === "active" ? "resolved" : "cancelled"}`}>
                    {user.status === "active" ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "محظور" : "Banned")}
                  </span>
                </td>
                <td data-label={lang === "ar" ? "العضوية" : "Membership"}>
                  <span className={`status-badge ${user.is_premium === 1 ? "resolved" : "open"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {user.is_premium === 1 && <Crown size={12} style={{ color: "var(--accent)" }} />}
                    {user.is_premium === 1 ? (lang === "ar" ? "مميز" : "Premium") : (lang === "ar" ? "عادي" : "Normal")}
                  </span>
                </td>
                <td data-label={lang === "ar" ? "العملات" : "Coins"}>{user.coins?.toLocaleString() || 0}</td>
                <td data-label={lang === "ar" ? "إجراءات" : "Actions"}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                    <button 
                      className="primary" 
                      type="button" 
                      onClick={() => {
                        setCoinsModal({ isOpen: true, user, mode: "send" });
                      }}
                      style={{ padding: "6px 10px", fontSize: "0.75rem", background: "var(--accent)", color: "#000", fontWeight: "800", height: "32px", borderRadius: "8px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {lang === "ar" ? "إرسال عملات" : "Send Coins"}
                    </button>
                    <button 
                      className="danger-btn" 
                      type="button" 
                      onClick={() => {
                        setCoinsModal({ isOpen: true, user, mode: "withdraw" });
                      }}
                      style={{ padding: "6px 10px", fontSize: "0.75rem", background: "#e53e3e", color: "#fff", fontWeight: "800", height: "32px", borderRadius: "8px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {lang === "ar" ? "سحب" : "Withdraw"}
                    </button>
                    <button 
                      className="primary" 
                      type="button" 
                      onClick={() => handleUserAction(user.status === "active" ? "ban" : "unban", user.id)}
                      style={{ padding: "6px 10px", fontSize: "0.75rem", height: "32px", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {user.status === "active" ? (lang === "ar" ? "حظر" : "Ban") : (lang === "ar" ? "تفعيل" : "Activate")}
                    </button>
                    <button 
                      className="primary" 
                      type="button" 
                      style={{
                        padding: "6px 10px",
                        fontSize: "0.75rem",
                        height: "32px",
                        borderRadius: "8px",
                        background: user.is_premium === 1 ? "rgba(255,255,255,0.05)" : "var(--accent)",
                        color: user.is_premium === 1 ? "var(--text)" : "#000",
                        border: "1px solid var(--line)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontWeight: "800"
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
                      {user.is_premium === 1 ? (lang === "ar" ? "عادي" : "Revoke") : (lang === "ar" ? "مميز" : "Premium")}
                    </button>
                    <button 
                      className="danger-btn" 
                      type="button" 
                      onClick={() => handleUserAction("delete", user.id)}
                      style={{ padding: "6px 10px", fontSize: "0.75rem", height: "32px", borderRadius: "8px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      {lang === "ar" ? "حذف" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Coins Management Custom Modal */}
      {coinsModal.isOpen && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="glass" style={{
            width: "100%",
            maxWidth: "420px",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid var(--line)",
            backgroundColor: "var(--panel-solid)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ marginBottom: "8px", color: "var(--accent)" }}>
              {coinsModal.mode === "send" 
                ? (lang === "ar" ? "إرسال عملات للاعب" : "Send Coins to Player")
                : (lang === "ar" ? "سحب عملات من اللاعب" : "Withdraw Coins")}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              {lang === "ar" 
                ? `المستخدم: ${coinsModal.user?.username} (الرصيد الحالي: ${coinsModal.user?.coins?.toLocaleString()})`
                : `User: ${coinsModal.user?.username} (Current: ${coinsModal.user?.coins?.toLocaleString()})`}
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const amount = parseInt(coinsAmount, 10);
              if (isNaN(amount) || amount <= 0) {
                toast.error(lang === "ar" ? "يرجى إدخال رقم صحيح أكبر من 0" : "Please enter a valid positive number");
                return;
              }
              if (coinsModal.mode === "send") {
                handleDistributeCoins(coinsModal.user.id, amount);
              } else {
                handleDeductCoins(coinsModal.user.id, amount);
              }
              setCoinsModal({ isOpen: false, user: null, mode: "send" });
              setCoinsAmount("");
            }}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "8px" }}>
                  {lang === "ar" ? "عدد العملات" : "Coins Amount"}
                </label>
                <input
                  type="number"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(e.target.value)}
                  placeholder={lang === "ar" ? "أدخل عدد العملات هنا..." : "Enter amount..."}
                  autoFocus
                  required
                  min="1"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    fontSize: "1rem",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setCoinsModal({ isOpen: false, user: null, mode: "send" });
                    setCoinsAmount("");
                  }}
                  className="hero-btn hero-btn-secondary"
                  style={{ padding: "8px 16px", minHeight: "auto", fontSize: "0.9rem" }}
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="hero-btn hero-btn-primary"
                  style={{ 
                    padding: "8px 20px", 
                    minHeight: "auto", 
                    fontSize: "0.9rem",
                    background: coinsModal.mode === "send" ? "var(--accent)" : "#dc2626",
                    color: coinsModal.mode === "send" ? "#000" : "#fff"
                  }}
                >
                  {coinsModal.mode === "send" 
                    ? (lang === "ar" ? "تأكيد الإرسال" : "Confirm Send")
                    : (lang === "ar" ? "تأكيد السحب" : "Confirm Withdraw")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
