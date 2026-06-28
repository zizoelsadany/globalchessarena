import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { verifyOtpUser, resendOtpCode } from "../services/auth.js";

export default function VerifyOtp() {
  const { user, setUser, token } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!token || !user) {
      navigate("/login", { replace: true });
      return;
    }
    // If already verified, redirect to dashboard
    if (user.is_verified) {
      navigate("/", { replace: true });
    }
  }, [user, token, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleVerify(e) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error(lang === "ar" ? "يجب أن يتكون رمز التحقق من 6 أرقام" : "OTP must be exactly 6 digits");
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtpUser(user.email, otp);
      toast.success(lang === "ar" ? "تم التحقق من الحساب بنجاح!" : "Account verified successfully!");
      if (data.user) {
        setUser(data.user);
      }
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOtpCode(user.email);
      toast.success(lang === "ar" ? "تم إعادة إرسال رمز التحقق" : "Verification code resent successfully");
      setCountdown(60); // 60 seconds rate limit
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  }

  const title = lang === "ar" ? "تفعيل الحساب" : "Account Verification";
  const subtitle = lang === "ar" 
    ? `لقد أرسلنا رمز التحقق المكون من 6 أرقام إلى البريد الإلكتروني ${user?.email || ""}`
    : `We sent a 6-digit verification code to ${user?.email || ""}`;

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form onSubmit={handleVerify} className="form">
        <label>
          {lang === "ar" ? "رمز التحقق (OTP)" : "Verification Code (OTP)"}
          <input
            type="text"
            required
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            style={{
              textAlign: "center",
              letterSpacing: "8px",
              fontSize: "1.5rem",
              fontWeight: "bold",
              borderRadius: "8px"
            }}
          />
        </label>
        
        <button className="primary" disabled={loading || otp.length !== 6}>
          {loading 
            ? (lang === "ar" ? "جاري التحقق..." : "Verifying...") 
            : (lang === "ar" ? "تأكيد" : "Verify")}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || countdown > 0}
          style={{
            background: "none",
            border: "none",
            color: countdown > 0 ? "var(--text-secondary)" : "var(--accent)",
            cursor: countdown > 0 ? "default" : "pointer",
            fontSize: "0.9rem",
            fontWeight: "600",
            textDecoration: "underline",
            opacity: countdown > 0 ? 0.7 : 1,
            transition: "opacity 0.2s ease"
          }}
        >
          {resending 
            ? (lang === "ar" ? "جاري الإرسال..." : "Resending...") 
            : countdown > 0 
              ? (lang === "ar" ? `إعادة الإرسال خلال ${countdown} ثانية` : `Resend code in ${countdown}s`)
              : (lang === "ar" ? "إعادة إرسال الرمز" : "Resend Verification Code")}
        </button>
      </div>

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => {
            setUser(null);
            localStorage.removeItem("gca_token");
            localStorage.removeItem("gca_user");
            navigate("/login");
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "0.85rem",
            opacity: 0.8
          }}
        >
          {lang === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}
        </button>
      </div>
    </AuthShell>
  );
}
