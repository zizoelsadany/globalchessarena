import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { LoaderCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OnlinePlayers from "../components/OnlinePlayers.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useSocketEvent } from "../hooks/useSocketEvent.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Matchmaking() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [queued, setQueued] = useState(false);
  const { t, lang } = useLanguage();

  useSocketEvent(socket, "matchmakingStatus", () => setQueued(true));

  function findMatch() {
    if (!socket) return toast.error(lang === "ar" ? "غير متصل بالخادم" : "Socket is not connected yet");
    setQueued(true);
    socket.emit("findMatch");
  }

  return (
    <div className="two-column">
      <section className="matchmaking panel">
        <div className="pulse-ring">{queued ? <LoaderCircle className="spin" /> : <Search />}</div>
        <span className="eyebrow">{t("matchmaking")}</span>
        <h2>{queued ? t("searchingOpponent") : t("readyNextGame")}</h2>
        <p>{t("pairingUsesQueue")}</p>
        <button className="primary" onClick={findMatch} disabled={queued}>{queued ? t("inQueue") : t("findMatch")}</button>
      </section>
      <OnlinePlayers />
    </div>
  );
}
