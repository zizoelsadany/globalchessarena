import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { LoaderCircle, Search, X, Check, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnlinePlayers from "../components/OnlinePlayers.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Matchmaking() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [queued, setQueued] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle"); // 'idle', 'searching', 'found'
  const [countdown, setCountdown] = useState(5);
  const [roomData, setRoomData] = useState(null);
  
  const timerRef = useRef(null);

  // Listen to socket events
  useEffect(() => {
    if (!socket) return;

    function handleStatus({ status }) {
      if (status === "queued") {
        setQueued(true);
        setSearchStatus("searching");
      } else if (status === "idle") {
        setQueued(false);
        setSearchStatus("idle");
      }
    }

    function handleMatchFound({ roomId, color }) {
      setSearchStatus("found");
      setRoomData({ roomId, color });
      setCountdown(5);

      // Start 5 second countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            const colorText = color === "white" ? t("white") : t("black");
            toast.success(
              lang === "ar"
                ? `تم العثور على مباراة! ستلعب باللون ${colorText}.`
                : `Match found! You play as ${colorText}.`
            );
            navigate(`/game/${encodeURIComponent(roomId)}`, { state: { color } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    socket.on("matchmakingStatus", handleStatus);
    socket.on("matchFound", handleMatchFound);

    // Sync current queued state on mount (deferred to avoid setState-in-render warnings)
    const syncTimeout = setTimeout(() => {
      if (socket) {
        socket.emit("checkQueueStatus");
      }
    }, 0);

    return () => {
      socket.off("matchmakingStatus", handleStatus);
      socket.off("matchFound", handleMatchFound);
      clearTimeout(syncTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [socket, navigate, lang, t]);

  function findMatch() {
    if (!socket) return toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected yet");
    socket.emit("findMatch");
  }

  function cancelMatchmaking() {
    if (socket) {
      socket.emit("leaveQueue");
    }
    setQueued(false);
    setSearchStatus("idle");
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div className="two-column" style={{ position: "relative" }}>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes customPing {
          75%, 100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        @keyframes customPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: .7;
            transform: scale(1.08);
          }
        }
      `}</style>

      <section className="matchmaking panel">
        <div className="pulse-ring">
          <Search />
        </div>
        <span className="eyebrow">{t("matchmaking")}</span>
        <h2>{t("readyNextGame")}</h2>
        <p>{t("pairingUsesQueue")}</p>
        <button className="primary" onClick={findMatch}>
          {t("findMatch")}
        </button>
      </section>
      <OnlinePlayers />

      {/* Matchmaking Modal Overlay */}
      {searchStatus !== "idle" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            animation: "fadeInModal 0.25s ease-out"
          }}
        >
          <div
            className="glass"
            style={{
              width: "90%",
              maxWidth: "450px",
              padding: "40px 30px",
              borderRadius: "24px",
              textAlign: "center",
              boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Top Close Button for cancel (only available during searching state) */}
            {searchStatus === "searching" && (
              <button
                type="button"
                onClick={cancelMatchmaking}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
              >
                <X size={16} />
              </button>
            )}

            {searchStatus === "searching" ? (
              <>
                {/* Searching State */}
                <div style={{ position: "relative", margin: "0 auto 30px", width: "100px", height: "100px" }}>
                  {/* Outer Pulsing Glow */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      border: "2px solid var(--accent)",
                      animation: "customPing 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
                      opacity: 0.75
                    }}
                  />
                  {/* Inner Loading Circle */}
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }}
                  >
                    <LoaderCircle size={40} className="spin" style={{ color: "var(--accent)" }} />
                  </div>
                </div>

                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "12px", color: "var(--text)" }}>
                  {lang === "ar" ? "جاري البحث عن منافس..." : "Searching for an opponent..."}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "30px", padding: "0 10px", lineHeight: "1.5" }}>
                  {lang === "ar"
                    ? "يقوم النظام بمطابقة مستواك مع لاعب آخر متاح الآن. يرجى الانتظار."
                    : "The system is pairing your level with another active player. Please wait."}
                </p>

                <button
                  type="button"
                  className="secondary"
                  onClick={cancelMatchmaking}
                  style={{
                    padding: "12px 28px",
                    borderRadius: "12px",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {lang === "ar" ? "إلغاء البحث" : "Cancel Search"}
                </button>
              </>
            ) : (
              <>
                {/* Found Match State */}
                <div style={{ position: "relative", margin: "0 auto 30px", width: "100px", height: "100px" }}>
                  {/* Success Green Pulse */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      border: "2px solid #22c55e",
                      animation: "customPing 1.2s cubic-bezier(0, 0, 0.2, 1) infinite",
                      opacity: 0.6
                    }}
                  />
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #22c55e"
                    }}
                  >
                    <Check size={44} style={{ color: "#22c55e" }} />
                  </div>
                </div>

                <h3 style={{ fontSize: "1.6rem", fontWeight: "700", marginBottom: "12px", color: "#22c55e" }}>
                  {lang === "ar" ? "تم العثور على لاعب!" : "Opponent Found!"}
                </h3>
                
                <div 
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    backgroundColor: "rgba(255,255,255,0.06)", 
                    padding: "8px 18px", 
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    marginBottom: "24px"
                  }}
                >
                  <Gamepad2 size={16} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text)" }}>
                    {lang === "ar" 
                      ? `اللون: ${roomData?.color === "white" ? "الأبيض" : "الأسود"}` 
                      : `Color: ${roomData?.color === "white" ? "White" : "Black"}`}
                  </span>
                </div>

                <div style={{ margin: "20px 0" }}>
                  <div 
                    style={{ 
                      fontSize: "3.5rem", 
                      fontWeight: "800", 
                      color: "var(--text)", 
                      animation: "customPulse 1s infinite" 
                    }}
                  >
                    {countdown}
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "8px" }}>
                    {lang === "ar" ? "جاري تحويلك إلى رقعة اللعب تلقائياً..." : "Redirecting you to the board automatically..."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
