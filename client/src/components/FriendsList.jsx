import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { api } from "../services/api.js";
import toast from "react-hot-toast";
import { UserPlus, Check, X, Swords, Trash2, Users } from "lucide-react";

export default function FriendsList() {
  const { user } = useAuth();
  const { socket, onlinePlayers } = useSocket();
  const { lang } = useLanguage();
  const [friends, setFriends] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  async function fetchFriends() {
    try {
      const res = await api("/premium/friends");
      setFriends(res.friends);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  }

  async function handleAddFriend(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const res = await api("/premium/friends/add", {
        method: "POST",
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });
      toast.success(res.message);
      setInviteCode("");
      fetchFriends();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(friendshipId, action) {
    try {
      const res = await api("/premium/friends/respond", {
        method: "POST",
        body: JSON.stringify({ friendshipId, action })
      });
      toast.success(res.message);
      fetchFriends();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRemove(friendshipId) {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذا الصديق؟" : "Are you sure you want to remove this friend?")) return;
    try {
      const res = await api("/premium/friends/remove", {
        method: "POST",
        body: JSON.stringify({ friendshipId })
      });
      toast.success(res.message);
      fetchFriends();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleChallenge(friendInviteCode, friendUsername) {
    if (!socket) {
      return toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected");
    }
    socket.emit("sendGameInvite", { targetCode: friendInviteCode });
    toast.success(lang === "ar" ? `تم إرسال التحدي إلى ${friendUsername}` : `Challenge sent to ${friendUsername}!`);
  }

  // Filter friends list
  const pendingRequests = friends.filter(f => f.status === "pending" && f.requester_id !== user?.id);
  const sentRequests = friends.filter(f => f.status === "pending" && f.requester_id === user?.id);
  const acceptedFriends = friends.filter(f => f.status === "accepted");

  // Helper to check if friend is online
  function isFriendOnline(friendId) {
    return onlinePlayers.some(p => p.id === friendId);
  }

  return (
    <div className="panel friends-panel" style={{
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      backgroundColor: "var(--panel-solid)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Users style={{ color: "var(--accent)" }} size={22} />
        <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800" }}>
          {lang === "ar" ? "الأصدقاء" : "Friends"}
        </h3>
      </div>

      {/* Add Friend Form */}
      <form onSubmit={handleAddFriend} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder={lang === "ar" ? "أدخل معرف الصديق (6 أرقام)..." : "Enter friend ID (6 digits)..."}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            backgroundColor: "rgba(255,255,255,0.03)",
            color: "var(--text)",
            outline: "none",
            fontSize: "0.9rem"
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--accent)",
            color: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: "700"
          }}
        >
          <UserPlus size={16} />
        </button>
      </form>

      {/* Pending Requests Received */}
      {pendingRequests.length > 0 && (
        <div>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {lang === "ar" ? "طلبات صداقة واردة" : "Incoming Friend Requests"}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingRequests.map(f => (
              <div key={f.friendship_id} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid var(--line)"
              }}>
                <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{f.username}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleRespond(f.friendship_id, "accept")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: "#22c55e",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRespond(f.friendship_id, "reject")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: "#ef4444",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {lang === "ar" ? "قائمة الأصدقاء" : "Friends List"}
        </h4>
        {acceptedFriends.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
            {lang === "ar" ? "لا يوجد أصدقاء مضافين بعد" : "No friends added yet."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {acceptedFriends.map(f => {
              const online = isFriendOnline(f.friend_id);
              return (
                <div key={f.friendship_id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--line)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: online ? "#22c55e" : "#64748b",
                        boxShadow: online ? "0 0 8px #22c55e" : "none"
                      }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: "700" }}>{f.username}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{f.elo_rating} Elo</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleChallenge(f.invite_code, f.username)}
                      disabled={!online}
                      title={lang === "ar" ? "تحدي الصديق" : "Challenge Friend"}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: online ? "var(--accent)" : "rgba(255,255,255,0.05)",
                        color: online ? "black" : "var(--muted)",
                        cursor: online ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: "700",
                        fontSize: "0.8rem",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Swords size={12} />
                      <span>{lang === "ar" ? "تحدي" : "Play"}</span>
                    </button>

                    <button
                      onClick={() => handleRemove(f.friendship_id)}
                      title={lang === "ar" ? "إزالة الصديق" : "Remove Friend"}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        backgroundColor: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
