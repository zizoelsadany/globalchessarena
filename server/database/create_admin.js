import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

function usage() {
  console.log("Usage: node create_admin.js <email> <password> [username]");
  console.log("Example: node create_admin.js admin@example.com strongPass123 AdminUser");
}

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureSchema(connection) {
  const [columns] = await connection.execute("SHOW COLUMNS FROM users");
  const fields = new Set(columns.map((col) => col.Field));

  if (!fields.has("role") || !fields.has("status")) {
    const alterations = [];
    if (!fields.has("role")) {
      alterations.push("ADD COLUMN role ENUM('player', 'admin') NOT NULL DEFAULT 'player'");
    }
    if (!fields.has("status")) {
      alterations.push("ADD COLUMN status ENUM('active', 'banned') NOT NULL DEFAULT 'active'");
    }
    const sql = `ALTER TABLE users ${alterations.join(", ")}`;
    await connection.execute(sql);
    console.log("Updated users table with role/status columns.");
  }

  if (!fields.has("invite_code")) {
    await connection.execute("ALTER TABLE users ADD COLUMN invite_code CHAR(6) UNIQUE NULL");
    console.log("Added invite_code column to users table.");
  }
}

async function createOrUpdateInviteCode(connection, userId) {
  const [existing] = await connection.execute("SELECT invite_code FROM users WHERE id = ?", [userId]);
  if (existing[0]?.invite_code) return existing[0].invite_code;

  const [usedCodes] = await connection.execute("SELECT invite_code FROM users WHERE invite_code IS NOT NULL AND invite_code != ''");
  const usedSet = new Set(usedCodes.map((row) => row.invite_code));
  let inviteCode;
  let attempts = 0;

  do {
    inviteCode = generateInviteCode();
    attempts += 1;
    if (attempts > 50) throw new Error("Unable to generate a unique invite code");
  } while (usedSet.has(inviteCode));

  await connection.execute("UPDATE users SET invite_code = ? WHERE id = ?", [inviteCode, userId]);

  return inviteCode;
}

async function main() {
  const [,, email, password, username = "Admin"] = process.argv;
  if (!email || !password) {
    usage();
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "global_chess_arena"
  });

  try {
    await ensureSchema(connection);

    const passwordHash = await bcrypt.hash(password, 12);
    const [rows] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

    let userId;
    if (rows.length > 0) {
      userId = rows[0].id;
      await connection.execute(
        "UPDATE users SET username = COALESCE(?, username), password = ?, role = 'admin', status = 'active' WHERE id = ?",
        [username, passwordHash, userId]
      );
      console.log(`Updated existing user ${email} to admin.`);
    } else {
      const [insertResult] = await connection.execute(
        "INSERT INTO users (username, email, password, avatar, role, status) VALUES (?, ?, ?, NULL, 'admin', 'active')",
        [username, email, passwordHash]
      );
      userId = insertResult.insertId;
      console.log(`Created new admin user ${email}.`);
    }

    const inviteCode = await createOrUpdateInviteCode(connection, userId);
    console.log("Admin account setup complete:");
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Username: ${username}`);
    console.log(`  Invite code: ${inviteCode}`);
    console.log("Login using the normal app login screen.");
  } catch (error) {
    console.error("Failed to create admin account:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
