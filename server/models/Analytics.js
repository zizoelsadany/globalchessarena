import { pool } from '../config/db.js';

export async function initAnalytics() {
  await pool.execute('CREATE TABLE IF NOT EXISTS site_stats (id INT PRIMARY KEY, visits INT DEFAULT 0)');
  const [rows] = await pool.execute('SELECT * FROM site_stats WHERE id = 1');
  if (rows.length === 0) {
    await pool.execute('INSERT INTO site_stats (id, visits) VALUES (1, 0)');
  }
}

export async function incrementVisits() {
  try {
    await pool.execute('UPDATE site_stats SET visits = visits + 1 WHERE id = 1');
  } catch (err) {
    console.error(err);
  }
}

export async function getVisits() {
  try {
    const [rows] = await pool.execute('SELECT visits FROM site_stats WHERE id = 1');
    return rows[0]?.visits || 0;
  } catch (err) {
    return 0;
  }
}

export async function resetVisits() {
  try {
    await pool.execute('UPDATE site_stats SET visits = 0 WHERE id = 1');
  } catch (err) {
    console.error(err);
  }
}
