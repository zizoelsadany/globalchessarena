import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";

export default function CheckoutMock() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { lang } = useLanguage();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      toast.error("Invalid session");
      navigate("/");
    }
  }, [sessionId, navigate]);

  async function handlePayment(success) {
    setProcessing(true);
    try {
      const res = await api("/premium/checkout/verify", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          status: success ? "success" : "cancel"
        })
      });

      if (success && res.success) {
        if (res.pendingApproval) {
          toast.success(res.message || (lang === "ar" ? "طلبك قيد المراجعة، وسيتم التفعيل خلال ساعتين." : "Your request is under review. Activation will take place within 2 hours."), { duration: 6000 });
        } else {
          toast.success(lang === "ar" ? "تمت الترقية إلى بريميوم بنجاح! 🎉" : "Successfully upgraded to Premium! 🎉");
        }
        if (refreshUser) await refreshUser();
        navigate("/");
      } else {
        toast.error(lang === "ar" ? "تم إلغاء عملية الدفع" : "Payment cancelled");
        navigate("/");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#12141c",
      color: "#f8fafc",
      fontFamily: "system-ui, sans-serif"
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1,
        padding: "48px",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0f111a"
      }}>
        <div>
          <button 
            onClick={() => handlePayment(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.95rem",
              padding: 0,
              marginBottom: "32px"
            }}
          >
            <ArrowLeft size={16} />
            <span>{lang === "ar" ? "العودة للموقع" : "Back to Arena"}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            <span style={{ fontSize: "2rem" }}>♟️</span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" }}>
              Global Chess Arena
            </h1>
          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>
            {lang === "ar" ? "الاشتراك المميز" : "Premium Membership"}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "24px" }}>
            <span style={{ fontSize: "3rem", fontWeight: "800", color: "#f8fafc" }}>$9.99</span>
            <span style={{ color: "#94a3b8", fontSize: "1.1rem" }}>/ {lang === "ar" ? "شهر" : "mo"}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#cbd5e1" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ color: "#4caf50", fontSize: "1.2rem" }}>✓</span>
              <span>{lang === "ar" ? "مدرب شطرنج ذكي متوفر 24/7" : "Simulated AI Coach available 24/7"}</span>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ color: "#4caf50", fontSize: "1.2rem" }}>✓</span>
              <span>{lang === "ar" ? "تحليل مباريات غير محدود بالـ Stockfish" : "Unlimited Stockfish match analysis"}</span>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ color: "#4caf50", fontSize: "1.2rem" }}>✓</span>
              <span>{lang === "ar" ? "ألغاز شطرنج تكتيكية غير محدودة" : "Unlimited tactical puzzles"}</span>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ color: "#4caf50", fontSize: "1.2rem" }}>✓</span>
              <span>{lang === "ar" ? "أشكال وسمات رقع وقطع حصرية" : "Exclusive piece themes & skins"}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "0.85rem" }}>
          <ShieldCheck size={16} />
          <span>Demo checkout secured by mock payment gateway.</span>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: 1,
        padding: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "24px", color: "#f8fafc" }}>
            {lang === "ar" ? "تفاصيل الدفع التجريبي" : "Mock Payment Details"}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                {lang === "ar" ? "البريد الإلكتروني" : "Email address"}
              </label>
              <input 
                type="email" 
                value="demo_user@chessarena.com" 
                readOnly
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  backgroundColor: "#1e293b",
                  color: "#cbd5e1",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
                {lang === "ar" ? "معلومات البطاقة" : "Card information"}
              </label>
              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}>
                <input 
                  type="text" 
                  value="4242  4242  4242  4242" 
                  readOnly
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 42px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    backgroundColor: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: "0.95rem"
                  }}
                />
                <CreditCard size={18} style={{ position: "absolute", left: "14px", color: "#64748b" }} />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <input 
                  type="text" 
                  value="12 / 29" 
                  readOnly
                  style={{
                    width: "50%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    backgroundColor: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: "0.95rem",
                    textAlign: "center"
                  }}
                />
                <input 
                  type="text" 
                  value="424" 
                  readOnly
                  style={{
                    width: "50%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    backgroundColor: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: "0.95rem",
                    textAlign: "center"
                  }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handlePayment(true)}
            disabled={processing}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#22c55e",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
              boxShadow: "0 4px 12px rgba(34, 197, 94, 0.2)"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#16a34a"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#22c55e"}
          >
            {processing ? (lang === "ar" ? "جاري المعالجة..." : "Processing...") : `${lang === "ar" ? "دفع" : "Pay"} $9.99`}
          </button>

          <button
            onClick={() => handlePayment(false)}
            disabled={processing}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer",
              marginTop: "12px"
            }}
          >
            {lang === "ar" ? "إلغاء عملية الدفع" : "Cancel Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
