import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function main() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "global_chess_arena"
  });

  try {
    console.log("Checking for invite_code column...");
    const [cols] = await connection.execute("SHOW COLUMNS FROM users LIKE 'invite_code'");
    if (!cols || cols.length === 0) {
      console.log("Column not found — adding invite_code column...");
      await connection.execute("ALTER TABLE users ADD COLUMN invite_code CHAR(6) UNIQUE NULL");
      console.log("Column added.");
    } else {
      console.log("Column already exists.");
    }

    console.log("Collecting existing invite codes...");
    const [rows] = await connection.execute("SELECT invite_code FROM users WHERE invite_code IS NOT NULL AND invite_code != ''");
    const used = new Set(rows.map((r) => r.invite_code));

    console.log("Finding users without invite_code...");
    const [noCodeUsers] = await connection.execute("SELECT id FROM users WHERE invite_code IS NULL OR invite_code = ''");
    console.log(`Users to update: ${noCodeUsers.length}`);

    for (const user of noCodeUsers) {
      let code;
      let attempts = 0;
      do {
        code = generateCode();
        attempts += 1;
        if (attempts > 50) throw new Error('Failed to generate unique invite code after many attempts');
      } while (used.has(code));

      used.add(code);
      await connection.execute("UPDATE users SET invite_code = :code WHERE id = :id", { code, id: user.id });
      console.log(`Updated user ${user.id} -> ${code}`);
    }

    console.log("Backfill complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await connection.end();
    console.log("Database connection closed.");
  }
}

main();
