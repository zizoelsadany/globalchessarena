import { pool } from "../config/db.js";

export async function createNotification(message) {
  const [result] = await pool.execute(
    "INSERT INTO notifications (message) VALUES (:message)",
    { message }
  );
  const [rows] = await pool.execute("SELECT * FROM notifications WHERE id = :id", { id: result.insertId });
  return rows[0] || null;
}

export async function listNotifications({ limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const [rows] = await pool.execute(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT ${safeLimit}`
  );
  return rows;
}
