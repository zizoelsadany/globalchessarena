import { Wifi } from "lucide-react";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getAvatarSrc } from "../data/avatarOptions.js";

export default function OnlinePlayers() {
  const { onlinePlayers } = useSocket();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <section className="panel">
      <div className="panel-title">
        <Wifi size={18} style={{ color: "var(--accent)" }} />
        <h2>{isAdmin ? "Online Players" : "Arena Activity"}</h2>
      </div>
      {isAdmin ? (
        <div className="player-list">
          {onlinePlayers.map((player) => (
            <div className="player-row" key={player.id}>
              <div className="avatar sm">{player.avatar ? <img src={getAvatarSrc(player.avatar)} alt="" /> : player.username[0]}</div>
              <div>
                <strong>{player.username}</strong>
                <span>Elo: {player.elo_rating} • ID: {player.invite_code || "------"}</span>
              </div>
              <i />
            </div>
          ))}
          {!onlinePlayers.length && <p className="muted">No players online yet.</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 0" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>
            <span style={{ color: "var(--accent)" }}>{onlinePlayers.length}</span> {onlinePlayers.length === 1 ? "Player Online" : "Players Online"}
          </div>
          <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
            Play matchmaking or invite a friend directly to start a game!
          </p>
        </div>
      )}
    </section>
  );
}
