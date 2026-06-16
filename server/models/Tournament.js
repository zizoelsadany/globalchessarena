import { pool } from "../config/db.js";

export async function createTournament({ name, description, status }) {
  const [result] = await pool.execute(
    "INSERT INTO tournaments (name, description, status) VALUES (:name, :description, :status)",
    { name, description: description || null, status }
  );
  const [rows] = await pool.execute("SELECT * FROM tournaments WHERE id = :id", { id: result.insertId });
  return rows[0] || null;
}

export async function listTournaments({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [rows] = await pool.execute(
    `SELECT * FROM tournaments ORDER BY created_at DESC LIMIT ${safeLimit}`
  );
  return rows;
}

export async function getTournamentById(tournamentId, userId = 0) {
  const [rows] = await pool.execute(
    `SELECT t.*, 
      (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) AS participant_count,
      EXISTS(SELECT 1 FROM tournament_participants tp WHERE tp.tournament_id = t.id AND tp.user_id = :userId) AS joined
     FROM tournaments t
     WHERE t.id = :id`,
    { id: tournamentId, userId }
  );
  return rows[0] || null;
}

export async function joinTournament(userId, tournamentId) {
  await pool.execute(
    "INSERT IGNORE INTO tournament_participants (tournament_id, user_id) VALUES (:tournamentId, :userId)",
    { tournamentId, userId }
  );
  return getTournamentById(tournamentId, userId);
}

export async function updateTournament(tournamentId, { name, description, status }) {
  await pool.execute(
    "UPDATE tournaments SET name = COALESCE(:name, name), description = COALESCE(:description, description), status = COALESCE(:status, status), updated_at = UTC_TIMESTAMP() WHERE id = :tournamentId",
    { tournamentId, name: name || null, description: description || null, status: status || null }
  );
  const [rows] = await pool.execute("SELECT * FROM tournaments WHERE id = :id", { id: tournamentId });
  return rows[0] || null;
}

export async function deleteTournament(tournamentId) {
  await pool.execute("DELETE FROM tournaments WHERE id = :tournamentId", { tournamentId });
}
