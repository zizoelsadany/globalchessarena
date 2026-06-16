import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'global_chess_arena'
  });

  try {
    const [rows] = await conn.execute("SHOW TABLES LIKE 'tournament_participants'");
    if (rows.length) {
      console.log('FOUND');
    } else {
      console.log('MISSING');
    }
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await conn.end();
  }
}

main();
