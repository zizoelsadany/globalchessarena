import { pool } from "../config/db.js";

/**
 * Moves ended matches older than 30 days to the archived_matches and archived_moves tables,
 * keeping the primary transactional tables clean and fast.
 */
export async function archiveOldMatches() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log("[Archive Service] Checking for ended matches older than 30 days...");

    // Find ended matches older than 30 days
    const [oldMatches] = await connection.execute(
      `SELECT id FROM matches 
       WHERE end_time IS NOT NULL 
         AND end_time < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)`
    );

    if (oldMatches.length === 0) {
      console.log("[Archive Service] No old matches to archive.");
      await connection.commit();
      return 0;
    }

    const matchIds = oldMatches.map(m => m.id);
    console.log(`[Archive Service] Archiving ${matchIds.length} matches...`);

    // 1. Copy moves to archived_moves
    await connection.query(
      `INSERT IGNORE INTO archived_moves (id, match_id, move_notation, move_time)
       SELECT id, match_id, move_notation, move_time 
       FROM moves 
       WHERE match_id IN (?)`,
      [matchIds]
    );

    // 2. Copy matches to archived_matches
    await connection.query(
      `INSERT IGNORE INTO archived_matches (id, white_player, black_player, winner, result, reason, start_time, end_time, tournament_id, scheduled_time)
       SELECT id, white_player, black_player, winner, result, reason, start_time, end_time, tournament_id, scheduled_time
       FROM matches 
       WHERE id IN (?)`,
      [matchIds]
    );

    // 3. Delete from matches (will CASCADE delete moves due to foreign key constraints)
    await connection.query(
      `DELETE FROM matches WHERE id IN (?)`,
      [matchIds]
    );

    await connection.commit();
    console.log(`[Archive Service] Successfully archived ${matchIds.length} matches and their moves.`);
    return matchIds.length;
  } catch (error) {
    await connection.rollback();
    console.error("[Archive Service] Failed to archive matches:", error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Starts the match archiving worker to run once a day.
 */
export function startArchiveWorker() {
  console.log("[Archive Service] Worker initialized to archive matches once every 24 hours.");
  // Run once after server startup
  setTimeout(async () => {
    try {
      await archiveOldMatches();
    } catch (err) {
      console.error("[Archive Service] Startup archive error:", err);
    }
  }, 10000);

  // Interval for once a day (24 hours)
  setInterval(async () => {
    try {
      await archiveOldMatches();
    } catch (err) {
      console.error("[Archive Service] Scheduled archive error:", err);
    }
  }, 24 * 60 * 60 * 1000);
}
