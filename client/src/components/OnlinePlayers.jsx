import { Wifi } from "lucide-react";
import { useSocket } from "../context/SocketContext.jsx";
import { getAvatarSrc } from "../data/avatarOptions.js";

export default function OnlinePlayers() {
  const { onlinePlayers } = useSocket();

  return (
    <section className="panel">
      <div className="panel-title">
        <Wifi size={18} />
        <h2>Online Players</h2>
      </div>
      <div className="player-list">
        {onlinePlayers.map((player) => (
          <div className="player-row" key={player.id}>
            <div className="avatar sm">{player.avatar ? <img src={getAvatarSrc(player.avatar)} alt="" /> : player.username[0]}</div>
            <div>
              <strong>{player.username}</strong>
              <span>{player.elo_rating} Elo • ID: {player.invite_code || "------"}</span>
            </div>
            <i />
          </div>
        ))}
        {!onlinePlayers.length && <p className="muted">No players online yet.</p>}
      </div>
    </section>
  );
}
