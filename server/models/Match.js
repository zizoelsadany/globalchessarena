import { pool } from "../config/db.js";

export async function createMatch({ whitePlayer, blackPlayer }) {
  const [result] = await pool.execute(
    "INSERT INTO matches (white_player, black_player) VALUES (:whitePlayer, :blackPlayer)",
    { whitePlayer, blackPlayer }
  );
  return result.insertId;
}

export async function finishMatch({ matchId, winner, result }) {
  await pool.execute(
    "UPDATE matches SET winner = :winner, result = :result, end_time = UTC_TIMESTAMP() WHERE id = :matchId",
    { matchId, winner: winner || null, result }
  );
}

export async function getMatchById(matchId) {
  const [rows] = await pool.execute(
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
  return rows[0] || null;
}

export async function listMatchesForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT m.*, 
      white.username AS white_username,
      black.username AS black_username,
      winner.username AS winner_username
     FROM matches m
     JOIN users white ON white.id = m.white_player
     JOIN users black ON black.id = m.black_player
     LEFT JOIN users winner ON winner.id = m.winner
     WHERE m.white_player = :userId OR m.black_player = :userId
     ORDER BY COALESCE(m.end_time, m.start_time) DESC
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

export async function countMatches() {
  const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM matches");
  return rows[0].count;
}
