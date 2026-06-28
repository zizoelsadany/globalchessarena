import { getUpcomingScheduledMatches, getMatchById, finishMatch } from "../models/Match.js";
import { getSocketServer } from "./socketServer.js";

const timers = new Map(); // matchId -> timeout
const cancelTimers = new Map(); // matchId -> timeout

function sendScheduledNotification(io, match) {
  try {
    const payload = {
      id: `match-${match.id}-${Date.now()}`,
      message: `Your tournament match is scheduled now: ${match.white_username} vs ${match.black_username}`,
      matchId: match.id,
      scheduledTime: match.scheduled_time,
      createdAt: new Date().toISOString()
    };
    // send to both players' private rooms
    if (match.white_player) io.to(`user:${match.white_player}`).emit("adminNotification", payload);
    if (match.black_player) io.to(`user:${match.black_player}`).emit("adminNotification", payload);
  } catch (e) {
    console.error("sendScheduledNotification error:", e);
  }
}

export function scheduleCancellationCheck(io, match) {
  if (!match || !match.id || !match.scheduled_time) return;
  const cancelTime = new Date(match.scheduled_time).getTime() + 5 * 60 * 1000;
  const now = Date.now();
  const delay = Math.max(0, cancelTime - now);

  if (cancelTimers.has(match.id)) {
    clearTimeout(cancelTimers.get(match.id));
    cancelTimers.delete(match.id);
  }

  const t = setTimeout(async () => {
    try {
      const currentMatch = await getMatchById(match.id);
      if (!currentMatch || currentMatch.winner || currentMatch.result) {
        return; // Already resolved
      }

      const gameSocket = await import("./gameSocket.js");
      const readyState = gameSocket.getTournamentMatchReadyState(match.id);

      if (readyState) {
        // If one is ready and one is not, the 5-minute forfeit timer from click event handles it.
        // But if neither is ready, cancel.
        if (!readyState.whiteReady && !readyState.blackReady) {
          await finishMatch({
            matchId: match.id,
            winner: null,
            result: "abandoned",
            reason: "abandoned"
          });
          io.to(`user:${match.white_player}`).emit("tournamentMatchCancelled", { matchId: match.id });
          io.to(`user:${match.black_player}`).emit("tournamentMatchCancelled", { matchId: match.id });
          io.emit("tournamentMatchUpdated", { matchId: match.id });
        }
      } else {
        // Neither player pressed "Start Match"
        await finishMatch({
          matchId: match.id,
          winner: null,
          result: "abandoned",
          reason: "abandoned"
        });
        io.to(`user:${match.white_player}`).emit("tournamentMatchCancelled", { matchId: match.id });
        io.to(`user:${match.black_player}`).emit("tournamentMatchCancelled", { matchId: match.id });
        io.emit("tournamentMatchUpdated", { matchId: match.id });
      }
      cancelTimers.delete(match.id);
    } catch (err) {
      console.error("Cancellation check error:", err);
    }
  }, delay);

  cancelTimers.set(match.id, t);
}

export function scheduleMatchNotification(io, match) {
  if (!match || !match.id || !match.scheduled_time) return;
  const scheduled = new Date(match.scheduled_time).getTime();
  const now = Date.now();
  const delay = Math.max(0, scheduled - now);
  if (timers.has(match.id)) {
    clearTimeout(timers.get(match.id));
    timers.delete(match.id);
  }
  if (delay === 0) {
    sendScheduledNotification(io, match);
    scheduleCancellationCheck(io, match);
    return;
  }
  const t = setTimeout(() => {
    sendScheduledNotification(io, match);
    timers.delete(match.id);
  }, delay);
  timers.set(match.id, t);

  scheduleCancellationCheck(io, match);
}

export function cancelScheduledNotification(matchId) {
  const t = timers.get(matchId);
  if (t) clearTimeout(t);
  timers.delete(matchId);

  const ct = cancelTimers.get(matchId);
  if (ct) clearTimeout(ct);
  cancelTimers.delete(matchId);
}

export async function loadAndScheduleUpcoming(io) {
  try {
    const matches = await getUpcomingScheduledMatches();
    for (const m of matches) {
      scheduleMatchNotification(io, m);
    }
  } catch (e) {
    console.error("loadAndScheduleUpcoming error:", e);
  }
}

export default { scheduleMatchNotification, cancelScheduledNotification, loadAndScheduleUpcoming, scheduleCancellationCheck };
