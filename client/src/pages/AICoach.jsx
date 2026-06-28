import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";
import toast from "react-hot-toast";
import { Bot, Send, Crown, Sparkles, MessageCircleCode } from "lucide-react";

export default function AICoach() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isPremium = user?.role === "admin" || user?.is_premium === 1;

  const [messages, setMessages] = useState([
    {
      sender: "coach",
      text: lang === "ar" 
        ? `مرحباً بك يا بطل! أنا مدربك الشخصي المدعوم بالذكاء الاصطناعي. كيف يمكنني مساعدتك في تطوير مهاراتك اليوم؟` 
        : `Welcome Champ! I am your AI Chess Coach. How can I help you improve your game today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await api("/premium/checkout", { method: "POST" });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.error("Failed to initiate checkout");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpgrading(false);
    }
  }

  async function handleSend(customText = null) {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMsg = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api("/premium/ai-coach", {
        method: "POST",
        body: JSON.stringify({ message: textToSend, lang })
      });
      setMessages((prev) => [...prev, { sender: "coach", text: res.reply }]);
    } catch (err) {
      toast.error(err.message);
      setMessages((prev) => [...prev, { sender: "coach", text: "Sorry, I am unable to connect right now." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isPremium) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "75vh",
        padding: "24px"
      }}>
        <div className="glass" style={{
          width: "100%",
          maxWidth: "550px",
          borderRadius: "24px",
          padding: "40px",
          textAlign: "center",
          border: "1px solid var(--accent-glow)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "var(--accent-glow)",
            border: "2px solid var(--accent)",
            color: "var(--accent)",
            marginBottom: "24px",
            animation: "pulse 2s infinite"
          }}>
            <Crown size={36} />
          </div>
          
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "12px", color: "var(--text)" }}>
            {lang === "ar" ? "افتح المدرب الذكي بالذكاء الاصطناعي" : "Unlock Your AI Chess Coach"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "32px" }}>
            {lang === "ar" 
              ? "احصل على نصائح فورية، تحليل مخصص لأسلوب لعبك، وافتتاحيات تناسب تصنيفك لتحسين مهاراتك بسرعة!" 
              : "Get real-time feedback, customized advice based on your rating, and tailored instructions to level up your chess skills today!"}
          </p>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "32px",
            textAlign: "left",
            backgroundColor: "rgba(255,255,255,0.03)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid var(--line)"
          }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.95rem" }}>{lang === "ar" ? "نصائح وإرشادات افتتاحيات مخصصة" : "Personalized opening repertoire advice"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.95rem" }}>{lang === "ar" ? "تحليل مباشر لمبارياتك الأخيرة" : "Live reviews of your recently played matches"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.95rem" }}>{lang === "ar" ? "إجابة جميع استفساراتك التكتيكية" : "Tactical concepts explainers on-demand"}</span>
            </div>
          </div>

          <button 
            onClick={handleUpgrade}
            disabled={upgrading}
            className="hero-btn hero-btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              minHeight: "54px",
              fontSize: "1.1rem"
            }}
          >
            <Crown size={20} />
            <span>{upgrading ? (lang === "ar" ? "جاري التحضير..." : "Preparing...") : (lang === "ar" ? "اشترك الآن بـ $9.99 فقط" : "Upgrade to Premium $9.99/mo")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "78vh",
      backgroundColor: "var(--panel-solid)",
      borderRadius: "16px",
      border: "1px solid var(--line)",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "var(--accent-glow)",
            border: "1px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Bot size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700" }}>
              {lang === "ar" ? "المدرب الذكي (بريميوم)" : "AI Chess Coach (Premium)"}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Crown size={12} />
              {lang === "ar" ? "أنت عضو بريميوم بطل" : "Premium Member benefits active"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages body */}
      <div style={{
        flex: 1,
        padding: "24px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            style={{
              display: "flex",
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start"
            }}
          >
            <div style={{
              maxWidth: "70%",
              padding: "12px 18px",
              borderRadius: "12px",
              lineHeight: "1.5",
              fontSize: "0.95rem",
              backgroundColor: m.sender === "user" ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: m.sender === "user" ? "black" : "var(--text)",
              border: m.sender === "user" ? "none" : "1px solid var(--line)",
              fontWeight: m.sender === "user" ? "600" : "400"
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "12px 18px",
              borderRadius: "12px",
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              fontSize: "0.9rem"
            }}>
              {lang === "ar" ? "جاري التفكير..." : "Thinking..."}
            </div>
          </div>
        )}
      </div>

      {/* Quick suggest chips */}
      <div style={{
        padding: "0 24px",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "12px"
      }}>
        {[
          { label: lang === "ar" ? "كيف أطور مستواي؟" : "How can I improve?", text: "How can I improve my ELO rating?" },
          { label: lang === "ar" ? "ما هي أفضل الافتتاحيات؟" : "Best opening strategies", text: "What chess opening should I study?" },
          { label: lang === "ar" ? "راجع مباراتي الأخيرة" : "Review my last match", text: "Review my last match" }
        ].map((chip, i) => (
          <button
            key={i}
            onClick={() => handleSend(chip.text)}
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              border: "1px solid var(--line)",
              backgroundColor: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid var(--line)",
        backgroundColor: "rgba(0,0,0,0.15)",
        display: "flex",
        gap: "12px"
      }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={lang === "ar" ? "اسأل المدرب أي سؤال في الشطرنج..." : "Ask your coach any chess question..."}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            backgroundColor: "rgba(255,255,255,0.03)",
            color: "var(--text)",
            outline: "none",
            fontSize: "0.95rem"
          }}
        />
        <button 
          onClick={() => handleSend()}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--accent)",
            color: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
