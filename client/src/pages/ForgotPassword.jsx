import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { forgotPassword, resetPassword } from "../services/auth.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter Code & Reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleRequestCode(e) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success(
        lang === "ar" 
          ? "إذا كان البريد مسجلاً، تم إرسال الرمز!" 
          : "If the email is registered, the reset code has been sent!"
      );
      setStep(2);
      setCountdown(60); // Rate limit resending code
    } catch (error) {
      let msg = error.message;
      if (lang === "ar" && msg.includes("Email not found")) {
        msg = "هذا البريد الإلكتروني غير مسجل لدينا!";
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!email || otp.length !== 6 || newPassword.length < 8) {
      if (newPassword.length < 8) {
        toast.error(lang === "ar" ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل" : "Password must be at least 8 characters");
      }
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      toast.success(
        lang === "ar"
          ? "تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول."
          : "Password reset successfully! You can now log in."
      );
      navigate("/login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const title = lang === "ar" ? "نسيت كلمة المرور" : "Forgot Password";
  const subtitle = step === 1
    ? (lang === "ar" ? "أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين" : "Enter your email to receive a password reset code")
    : (lang === "ar" ? `أدخل الرمز المرسل إلى ${email} وكلمة المرور الجديدة` : `Enter the code sent to ${email} and your new password`);

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {step === 1 ? (
        <form onSubmit={handleRequestCode} className="form">
          <label>
            {lang === "ar" ? "البريد الإلكتروني" : "Email Address"}
            <input
              type="email"
              required
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="primary" disabled={loading}>
            {loading 
              ? (lang === "ar" ? "جاري الإرسال..." : "Sending...") 
              : (lang === "ar" ? "إرسال رمز إعادة التعيين" : "Send Reset Code")}
          </button>

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: "0.85rem",
                textDecoration: "underline"
              }}
            >
              {lang === "ar" ? "لديك رمز بالفعل؟ اضغط هنا لإعادة التعيين" : "Already have a code? Click here to reset"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="form">
          <label>
            {lang === "ar" ? "البريد الإلكتروني" : "Email Address"}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

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
                letterSpacing: "4px",
                fontWeight: "bold"
              }}
            />
          </label>

          <label>
            {lang === "ar" ? "كلمة المرور الجديدة" : "New Password"}
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <button className="primary" disabled={loading || otp.length !== 6 || newPassword.length < 8}>
            {loading 
              ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") 
              : (lang === "ar" ? "تغيير كلمة المرور" : "Reset Password")}
          </button>

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                textDecoration: "underline"
              }}
            >
              {lang === "ar" ? "رجوع" : "Back"}
            </button>

            <button
              type="button"
              onClick={handleRequestCode}
              disabled={countdown > 0}
              style={{
                background: "none",
                border: "none",
                color: countdown > 0 ? "var(--text-secondary)" : "var(--accent)",
                cursor: countdown > 0 ? "default" : "pointer",
                fontSize: "0.85rem",
                textDecoration: "underline"
              }}
            >
              {countdown > 0 
                ? (lang === "ar" ? `إعادة الإرسال خلال ${countdown} ثانية` : `Resend in ${countdown}s`)
                : (lang === "ar" ? "إعادة إرسال الرمز" : "Resend Code")}
            </button>
          </div>
        </form>
      )}

      <p className="switch-auth" style={{ marginTop: "1.5rem" }}>
        <Link to="/login">{lang === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}</Link>
      </p>
    </AuthShell>
  );
}
