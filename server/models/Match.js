import { pool } from "../config/db.js";

export async function createMatch({ whitePlayer, blackPlayer }) {
  const [result] = await pool.execute(
    "INSERT INTO matches (white_player, black_player) VALUES (:whitePlayer, :blackPlayer)",
    { whitePlayer, blackPlayer }
  );
  return result.insertId;
}

export async function finishMatch({ matchId, winner, result, reason = null }) {
  try {
    await pool.execute(
      "UPDATE matches SET winner = :winner, result = :result, reason = :reason, end_time = UTC_TIMESTAMP() WHERE id = :matchId",
      { matchId, winner: winner || null, result, reason: reason || null }
    );
  } catch (error) {
    if (error?.code === "ER_BAD_FIELD_ERROR" && error?.sqlMessage?.includes("Unknown column 'reason'")) {
      await pool.execute(
        "UPDATE matches SET winner = :winner, result = :result, end_time = UTC_TIMESTAMP() WHERE id = :matchId",
        { matchId, winner: winner || null, result }
      );
      return;
    }
    throw error;
  }
}

export async function getMatchById(matchId) {
  let [rows] = await pool.execute(
    `SELECT m.*, 
      white.username AS white_username, white.elo_rating AS white_elo,
      black.username AS black_username, black.elo_rating AS black_elo,
      winner.username AS winner_username
     FROM matches m
     JOIN users white ON white.id = m.white_player
     JOIN users black ON black.id = m.black_player
     LEFT JOIN users winner ON winner.id = m.winner
     WHERE m.id = :matchId`,
    { matchId }
  );
  if (rows.length === 0) {
    [rows] = await pool.execute(
      `SELECT m.*, 
        white.username AS white_username, white.elo_rating AS white_elo,
        black.username AS black_username, black.elo_rating AS black_elo,
        winner.username AS winner_username
       FROM archived_matches m
       JOIN users white ON white.id = m.white_player
       JOIN users black ON black.id = m.black_player
       LEFT JOIN users winner ON winner.id = m.winner
       WHERE m.id = :matchId`,
      { matchId }
    );
  }
  return rows[0] || null;
}

export async function listMatchesForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM (
      (SELECT m.id, m.white_player, m.black_player, m.winner, m.result, m.reason, m.start_time, m.end_time, m.tournament_id, m.scheduled_time,
        white.username AS white_username,
        black.username AS black_username,
        winner.username AS winner_username
       FROM matches m
       JOIN users white ON white.id = m.white_player
       JOIN users black ON black.id = m.black_player
       LEFT JOIN users winner ON winner.id = m.winner
       WHERE m.white_player = :userId OR m.black_player = :userId)
      UNION ALL
      (SELECT am.id, am.white_player, am.black_player, am.winner, am.result, am.reason, am.start_time, am.end_time, am.tournament_id, am.scheduled_time,
        white.username AS white_username,
        black.username AS black_username,
        winner.username AS winner_username
       FROM archived_matches am
       JOIN users white ON white.id = am.white_player
       JOIN users black ON black.id = am.black_player
       LEFT JOIN users winner ON winner.id = am.winner
       WHERE am.white_player = :userId OR am.black_player = :userId)
     ) combined
     ORDER BY COALESCE(end_time, start_time) DESC
     LIMIT 50`,
    { userId }
  );
  return rows;
}

export async function listAllMatches({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [rows] = await pool.execute(
    `SELECT m.*, 
      white.username AS white_username,
      black.username AS black_username,
      winner.username AS winner_username
     FROM matches m
     JOIN users white ON white.id = m.white_player
     JOIN users black ON black.id = m.black_player
     LEFT JOIN users winner ON winner.id = m.winner
     ORDER BY COALESCE(m.end_time, m.start_time) DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

export async function getUpcomingScheduledMatches() {
  const [rows] = await pool.execute(
    `SELECT m.*,
      white.username AS white_username, white.elo_rating AS white_elo,
      black.username AS black_username, black.elo_rating AS black_elo
     FROM matches m
     JOIN users white ON white.id = m.white_player
     JOIN users black ON black.id = m.black_player
     WHERE m.scheduled_time IS NOT NULL AND m.scheduled_time > UTC_TIMESTAMP()
     ORDER BY m.scheduled_time ASC
     LIMIT 200`
  );
  return rows;
}

export async function countMatches() {
  const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM matches");
  return rows[0].count;
}

export async function deleteMatch(matchId) {
  await pool.execute("DELETE FROM matches WHERE id = :matchId", { matchId });
}
