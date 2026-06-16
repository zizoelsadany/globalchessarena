import { pool } from "../config/db.js";

export async function createReport({ reporterId, reportedUserId, type, message }) {
  const [result] = await pool.execute(
    "INSERT INTO reports (reporter_id, reported_user_id, type, message) VALUES (:reporterId, :reportedUserId, :type, :message)",
    { reporterId, reportedUserId: reportedUserId || null, type, message }
  );

  const [rows] = await pool.execute(
    `SELECT r.*, reporter.username AS reporter_username, reported.username AS reported_username
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_user_id
      WHERE r.id = :id`,
    { id: result.insertId }
  );

  return rows[0] || null;
}

export async function listReports({ status, limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const whereClause = status ? "WHERE r.status = :status" : "";
  const params = status ? { status } : {};
  const [rows] = await pool.execute(
    `SELECT r.*, reporter.username AS reporter_username, reported.username AS reported_username
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_user_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ${safeLimit}`,
    params
  );
  return rows;
}

export async function countOpenReports() {
  const [rows] = await pool.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'open'");
  return rows[0].count;
}

export async function updateReportStatus(reportId, status) {
  await pool.execute("UPDATE reports SET status = :status WHERE id = :reportId", { reportId, status });
  const [rows] = await pool.execute(
    `SELECT r.*, reporter.username AS reporter_username, reported.username AS reported_username
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_user_id
      WHERE r.id = :id`,
    { id: reportId }
  );
  return rows[0] || null;
}
