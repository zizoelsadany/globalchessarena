import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Bell, Mail, Send } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { createNotification, fetchAllUsers } from "../services/admin.js";

export default function AdminNotifications() {
  const { lang } = useLanguage();
  const [message, setMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await fetchAllUsers();
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    }
    loadUsers();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      toast.error(lang === "ar" ? "يرجى إدخال رسالة." : "Please enter a message.");
      return;
    }

    try {
      setSending(true);
      await createNotification(
        message.trim(),
        targetUserId ? targetUserId : null,
        sendEmail
      );
      setMessage("");
      setTargetUserId("");
      setSendEmail(false);
      toast.success(lang === "ar" ? "تم إرسال الرسالة بنجاح." : "Message sent successfully.");
    } catch (error) {
      toast.error(error.message || (lang === "ar" ? "حدث خطأ أثناء الإرسال." : "Error sending message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <section 
      className="glass" 
      style={{
        borderRadius: "20px",
        padding: "32px",
        border: "1px solid var(--line)",
        boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          backgroundColor: "var(--accent-glow)",
          border: "1px solid var(--accent)",
          boxShadow: "0 0 15px var(--accent-glow)",
          flexShrink: 0
        }}>
          <Bell size={20} style={{ color: "var(--accent)" }} />
        </div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--text)", margin: 0 }}>
          {lang === "ar" ? "مركز الإشعارات والرسائل" : "Message Center"}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text)" }}>
            {lang === "ar" ? "المستلم" : "Recipient"}
          </span>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: "var(--input-bg)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              outline: "none",
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--line)";
              e.target.style.boxShadow = "none";
            }}
          >
            <option value="">{lang === "ar" ? "📢 بث عام لجميع اللاعبين" : "📢 Broadcast to all players"}</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                👤 {u.username} ({u.email || "No Email"})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text)" }}>
            {lang === "ar" ? "محتوى الرسالة" : "Message Content"}
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "10px",
              backgroundColor: "var(--input-bg)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              outline: "none",
              fontSize: "0.95rem",
              fontFamily: "inherit",
              resize: "vertical",
              transition: "all 0.3s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--line)";
              e.target.style.boxShadow = "none";
            }}
            placeholder={lang === "ar" ? "اكتب رسالتك هنا..." : "Type your message here..."}
          />
        </div>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "14px 16px", 
          borderRadius: "10px", 
          backgroundColor: "var(--input-bg)", 
          border: "1px solid var(--line)" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Mail size={18} style={{ color: sendEmail ? "var(--accent)" : "var(--muted)" }} />
            <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text)" }}>
              {lang === "ar" ? "إرسال نسخة إلى البريد الإلكتروني" : "Send email notification"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSendEmail(!sendEmail)}
            style={{
              position: "relative",
              width: "48px",
              height: "26px",
              borderRadius: "15px",
              backgroundColor: sendEmail ? "var(--accent)" : "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
              padding: 0
            }}
          >
            <div style={{
              position: "absolute",
              top: "3px",
              left: sendEmail ? "25px" : "3px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "#fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              transition: "left 0.3s ease"
            }} />
          </button>
        </div>

        <button
          className="hero-btn hero-btn-primary"
          type="submit"
          disabled={sending}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            minHeight: "50px",
            borderRadius: "10px",
            fontWeight: "800",
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 4px 15px var(--accent-glow)",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px var(--accent-glow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px var(--accent-glow)";
          }}
        >
          <Send size={18} />
          <span>
            {sending 
              ? (lang === "ar" ? "جارِ الإرسال..." : "Sending...") 
              : (lang === "ar" ? "إرسال الرسالة" : "Send Message")}
          </span>
        </button>
      </form>
    </section>
  );
}
