import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, Check, X, Eye, ExternalLink, RefreshCw } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchPendingPayments, approvePayment, declinePayment } from "../services/admin.js";
import { normalizeAssetUrl } from "../services/api.js";

export default function AdminPayments() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingPayments();
      setPayments(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من تفعيل هذا الاشتراك المميز؟" : "Are you sure you want to approve this premium subscription?")) return;
    try {
      const res = await approvePayment(id);
      toast.success(res.message || (lang === "ar" ? "تم تفعيل الاشتراك المميز بنجاح!" : "Subscription activated successfully!"));
      loadPayments();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDecline = async (id) => {
    if (!window.confirm(lang === "ar" ? "هل أنت متأكد من رفض هذا الطلب؟" : "Are you sure you want to decline this request?")) return;
    try {
      const res = await declinePayment(id);
      toast.success(res.message || (lang === "ar" ? "تم رفض الطلب بنجاح." : "Request declined successfully."));
      loadPayments();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="panel" style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <p>{lang === "ar" ? "جار تحميل طلبات الدفع..." : "Loading payment requests..."}</p>
      </div>
    );
  }

  return (
    <section className="panel admin-dashboard" style={{ position: "relative" }}>
      <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={18} />
          <h2>{lang === "ar" ? "إدارة وتفعيل المدفوعات اليدوية" : "Manual Payments Management"}</h2>
        </div>
        <button 
          onClick={loadPayments}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
          <span>{lang === "ar" ? "تحديث" : "Refresh"}</span>
        </button>
      </div>

      <div className="table-wrap" style={{ marginTop: "20px" }}>
        {payments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
            {lang === "ar" ? "لا توجد طلبات دفع حالياً." : "No payment requests found."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{lang === "ar" ? "المستخدم" : "User"}</th>
                <th>{lang === "ar" ? "طريقة التحويل" : "Method"}</th>
                <th>{lang === "ar" ? "بيانات المرسل" : "Sender Info"}</th>
                <th>{lang === "ar" ? "رقم العملية" : "Transaction ID"}</th>
                <th>{lang === "ar" ? "المبلغ" : "Amount"}</th>
                <th>{lang === "ar" ? "إيصال التحويل" : "Receipt"}</th>
                <th>{lang === "ar" ? "الحالة" : "Status"}</th>
                <th>{lang === "ar" ? "التاريخ" : "Date"}</th>
                <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td data-label={lang === "ar" ? "المستخدم" : "User"}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong>{p.username}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.email}</span>
                    </div>
                  </td>
                  <td data-label={lang === "ar" ? "طريقة التحويل" : "Method"}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "6px", 
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      backgroundColor: p.payment_method === "vodafone_cash" ? "rgba(225, 29, 72, 0.15)" : "rgba(13, 148, 136, 0.15)",
                      color: p.payment_method === "vodafone_cash" ? "#f43f5e" : "#0d9488"
                    }}>
                      {p.payment_method === "vodafone_cash" 
                        ? (lang === "ar" ? "فودافون كاش" : "Vodafone Cash") 
                        : (lang === "ar" ? "إنستا باي" : "InstaPay")
                      }
                    </span>
                  </td>
                  <td data-label={lang === "ar" ? "بيانات المرسل" : "Sender Info"}>{p.sender_number || "-"}</td>
                  <td data-label={lang === "ar" ? "رقم العملية" : "Transaction ID"}>
                    <code style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                      {p.transaction_id || "-"}
                    </code>
                  </td>
                  <td data-label={lang === "ar" ? "المبلغ" : "Amount"}>${p.amount}</td>
                  <td data-label={lang === "ar" ? "إيصال التحويل" : "Receipt"}>
                    {p.receipt_url ? (
                      <button
                        onClick={() => setSelectedReceipt(normalizeAssetUrl(p.receipt_url))}
                        style={{
                          background: "rgba(251, 191, 36, 0.1)",
                          border: "1px solid rgba(251, 191, 36, 0.3)",
                          color: "#fbbf24",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Eye size={12} />
                        <span>{lang === "ar" ? "عرض الإيصال" : "View Receipt"}</span>
                      </button>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                        {lang === "ar" ? "لا يوجد إيصال" : "No receipt"}
                      </span>
                    )}
                  </td>
                  <td data-label={lang === "ar" ? "الحالة" : "Status"}>
                    <span className={`status-badge ${
                      p.status === "completed" ? "resolved" : p.status === "review" ? "open" : "cancelled"
                    }`}>
                      {p.status === "completed" && (lang === "ar" ? "مكتمل" : "Completed")}
                      {p.status === "review" && (lang === "ar" ? "قيد المراجعة" : "Under Review")}
                      {p.status === "failed" && (lang === "ar" ? "مرفوض/فاشل" : "Declined/Failed")}
                      {p.status !== "completed" && p.status !== "review" && p.status !== "failed" && p.status}
                    </span>
                  </td>
                  <td data-label={lang === "ar" ? "التاريخ" : "Date"}>
                    <span style={{ fontSize: "0.8rem" }}>
                      {new Date(p.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                    </span>
                  </td>
                  <td data-label={lang === "ar" ? "إجراءات" : "Actions"}>
                    {p.status === "review" ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleApprove(p.id)}
                          style={{
                            backgroundColor: "#22c55e",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.8rem",
                            fontWeight: "bold"
                          }}
                        >
                          <Check size={14} />
                          <span>{lang === "ar" ? "تفعيل" : "Approve"}</span>
                        </button>
                        <button
                          onClick={() => handleDecline(p.id)}
                          style={{
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.8rem",
                            fontWeight: "bold"
                          }}
                        >
                          <X size={14} />
                          <span>{lang === "ar" ? "رفض" : "Decline"}</span>
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Image Modal Preview */}
      {selectedReceipt && (
        <div 
          onClick={() => setSelectedReceipt(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: "20px"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
              backgroundColor: "#1e293b",
              padding: "8px",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
          >
            <button
              onClick={() => setSelectedReceipt(null)}
              style={{
                position: "absolute",
                top: "-15px",
                right: "-15px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
              }}
            >
              ✕
            </button>
            <img 
              src={selectedReceipt} 
              alt="Receipt Receipt Upload" 
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "8px",
                display: "block"
              }}
            />
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <a 
                href={selectedReceipt} 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  color: "#fbbf24", 
                  fontSize: "0.85rem", 
                  textDecoration: "underline",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <span>{lang === "ar" ? "فتح في نافذة جديدة" : "Open in new window"}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
