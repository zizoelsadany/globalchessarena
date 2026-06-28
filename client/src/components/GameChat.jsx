import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function GameChat({ messages, onSend, currentUserId }) {
  const { lang } = useLanguage();
  const [draft, setDraft] = useState("");

  const sendDisabled = draft.trim().length === 0;
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [messages]
  );

  return (
    <div className="game-chat panel" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{lang === "ar" ? "شات المباراة" : "Game chat"}</strong>
      </div>
      <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 6 }}>
        {sortedMessages.length === 0 ? (
          <div className="muted" style={{ padding: 10, border: "1px solid var(--line)", borderRadius: 12 }}>
            {lang === "ar" ? "لا توجد رسائل حتى الآن." : "No messages yet."}
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <div key={msg.id} style={{ padding: 10, borderRadius: 12, background: msg.userId === currentUserId ? "rgba(29, 155, 240, 0.12)" : "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{msg.username}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{msg.message}</div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={lang === "ar" ? "اكتب رسالة..." : "Type a message..."}
          style={{ flex: 1, minHeight: 42, borderRadius: 12, border: "1px solid var(--line)", padding: "10px 12px", background: "var(--panel)", color: "var(--text)" }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !sendDisabled) {
              event.preventDefault();
              onSend(draft.trim());
              setDraft("");
            }
          }}
        />
        <button
          className="primary"
          type="button"
          disabled={sendDisabled}
          onClick={() => {
            onSend(draft.trim());
            setDraft("");
          }}
          style={{ minWidth: 48, minHeight: 42, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
