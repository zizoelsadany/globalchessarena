import { pool } from "../config/db.js";

export async function createTournament({ name, description, status, max_participants, logo_url, style_color, ends_at }) {
  const [result] = await pool.execute(
    `INSERT INTO tournaments (name, description, status, max_participants, logo_url, style_color, ends_at) 
     VALUES (:name, :description, :status, :max_participants, :logo_url, :style_color, :ends_at)`,
    {
      name,
      description: description || null,
      status: status || "upcoming",
      max_participants: max_participants ? Number(max_participants) : 64,
      logo_url: logo_url || null,
      style_color: style_color || "#7cc96f",
      ends_at: ends_at || null
    }
  );
  const [rows] = await pool.execute("SELECT * FROM tournaments WHERE id = :id", { id: result.insertId });
  return rows[0] || null;
}

export async function listTournaments({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [rows] = await pool.execute(
    `SELECT t.*,
       (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) AS participant_count
     FROM tournaments t 
     ORDER BY t.created_at DESC 
     LIMIT ${safeLimit}`
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
  // Check if max participants is reached
  const tournament = await getTournamentById(tournamentId, userId);
  if (tournament && tournament.participant_count >= tournament.max_participants) {
    throw new Error("Tournament is full / البطولة ممتلئة بالكامل");
  }

  await pool.execute(
    "INSERT IGNORE INTO tournament_participants (tournament_id, user_id) VALUES (:tournamentId, :userId)",
    { tournamentId, userId }
  );
  return getTournamentById(tournamentId, userId);
}

export async function updateTournament(tournamentId, { name, description, status, max_participants, logo_url, style_color, ends_at }) {
  await pool.execute(
    `UPDATE tournaments 
     SET name = COALESCE(:name, name), 
         description = COALESCE(:description, description), 
         status = COALESCE(:status, status),
         max_participants = COALESCE(:max_participants, max_participants),
         logo_url = COALESCE(:logo_url, logo_url),
         style_color = COALESCE(:style_color, style_color),
         ends_at = COALESCE(:ends_at, ends_at),
         updated_at = UTC_TIMESTAMP() 
     WHERE id = :tournamentId`,
    {
      tournamentId,
      name: name || null,
      description: description || null,
      status: status || null,
      max_participants: max_participants ? Number(max_participants) : null,
      logo_url: logo_url || null,
      style_color: style_color || null,
      ends_at: ends_at || null
    }
  );
  const [rows] = await pool.execute("SELECT * FROM tournaments WHERE id = :id", { id: tournamentId });
  return rows[0] || null;
}

export async function deleteTournament(tournamentId) {
  await pool.execute("DELETE FROM tournaments WHERE id = :tournamentId", { tournamentId });
}

export async function getTournamentParticipants(tournamentId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.elo_rating, u.avatar, tp.joined_at
     FROM tournament_participants tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.tournament_id = :tournamentId
     ORDER BY tp.joined_at ASC`,
    { tournamentId }
  );
  return rows;
}

export async function getTournamentMatches(tournamentId) {
  const [rows] = await pool.execute(
    `SELECT m.*,
       white.username AS white_username, white.elo_rating AS white_elo,
       black.username AS black_username, black.elo_rating AS black_elo,
       winner.username AS winner_username
     FROM matches m
     JOIN users white ON white.id = m.white_player
     JOIN users black ON black.id = m.black_player
     LEFT JOIN users winner ON winner.id = m.winner
     WHERE m.tournament_id = :tournamentId
     ORDER BY m.scheduled_time ASC, m.start_time ASC`,
    { tournamentId }
  );
  return rows;
}

export async function createTournamentMatch({ tournamentId, whitePlayerId, blackPlayerId, scheduledTime }) {
  const [result] = await pool.execute(
    `INSERT INTO matches (tournament_id, white_player, black_player, scheduled_time)
     VALUES (:tournamentId, :whitePlayerId, :blackPlayerId, :scheduledTime)`,
    { tournamentId, whitePlayerId, blackPlayerId, scheduledTime: scheduledTime || null }
  );
  return result.insertId;
}

