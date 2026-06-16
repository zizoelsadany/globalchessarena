import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "../components/Loader.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useSocketEvent } from "../hooks/useSocketEvent.js";

export default function JoinInvite() {
  const { token } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (socket && token) {
      socket.emit("joinInvite", { inviteToken: token });
    }
  }, [socket, token]);

  useSocketEvent(socket, "matchFound", ({ roomId, color }) => {
    toast.success(t("joinedInviteGame", { color: color === "white" ? t("white") : t("black") }));
    navigate(`/game/${encodeURIComponent(roomId)}`, { state: { color } });
  });

  useSocketEvent(socket, "socketError", ({ message }) => {
    toast.error(message);
    navigate("/");
  });

  return (
    <div className="center-stage">
      <Loader label="Joining invite game... جاري الدخول إلى اللعبة..." />
    </div>
  );
}
