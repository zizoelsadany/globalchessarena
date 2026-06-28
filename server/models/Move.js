import { pool } from "../config/db.js";

export async function createMove({ matchId, notation }) {
  await pool.execute(
    "INSERT INTO moves (match_id, move_notation) VALUES (:matchId, :notation)",
    { matchId, notation }
  );
}

export async function listMovesForMatch(matchId) {
  let [rows] = await pool.execute(
    "SELECT id, match_id, move_notation, move_time FROM moves WHERE match_id = :matchId ORDER BY id ASC",
    { matchId }
  );
  if (rows.length === 0) {
    [rows] = await pool.execute(
      "SELECT id, match_id, move_notation, move_time FROM archived_moves WHERE match_id = :matchId ORDER BY id ASC",
      { matchId }
    );
  }
  return rows;
}
