import fs from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
dotenv.config({ path: envPath });

const schemaPath = path.join(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
    namedPlaceholders: true
  });

  try {
    console.log("Creating database schema from schema.sql...");
    await connection.query(schemaSql);
    console.log("Database schema created or verified successfully.");

    // Helper to check column existence
    const hasColumn = async (table, column) => {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :column`,
        { table, column }
      );
      return rows[0].count > 0;
    };

    // Migrating matches.reason
    if (!(await hasColumn("matches", "reason"))) {
      console.log("Adding missing reason column to matches table...");
      await connection.execute(
        `ALTER TABLE matches ADD COLUMN reason ENUM('resign', 'timeout', 'disconnect', 'stalemate', 'draw', 'checkmate', 'finished', 'abandoned') NULL`
      );
      console.log("Added reason column to matches table.");
    }

    // Migrating tournaments.max_participants
    if (!(await hasColumn("tournaments", "max_participants"))) {
      console.log("Adding max_participants to tournaments table...");
      await connection.execute(`ALTER TABLE tournaments ADD COLUMN max_participants INT NOT NULL DEFAULT 64`);
    }

    // Migrating tournaments.logo_url
    if (!(await hasColumn("tournaments", "logo_url"))) {
      console.log("Adding logo_url to tournaments table...");
      await connection.execute(`ALTER TABLE tournaments ADD COLUMN logo_url VARCHAR(500) NULL`);
    }

    // Migrating tournaments.style_color
    if (!(await hasColumn("tournaments", "style_color"))) {
      console.log("Adding style_color to tournaments table...");
      await connection.execute(`ALTER TABLE tournaments ADD COLUMN style_color VARCHAR(50) NOT NULL DEFAULT '#7cc96f'`);
    }

    // Migrating tournaments.ends_at
    if (!(await hasColumn("tournaments", "ends_at"))) {
      console.log("Adding ends_at to tournaments table...");
      await connection.execute(`ALTER TABLE tournaments ADD COLUMN ends_at DATETIME NULL`);
    }

    // Migrating matches.tournament_id
    if (!(await hasColumn("matches", "tournament_id"))) {
      console.log("Adding tournament_id to matches table...");
      await connection.execute(`ALTER TABLE matches ADD COLUMN tournament_id INT NULL`);
      await connection.execute(`ALTER TABLE matches ADD CONSTRAINT fk_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE`);
      await connection.execute(`ALTER TABLE matches ADD INDEX idx_matches_tournament_id (tournament_id)`);
    }

    // Migrating matches.scheduled_time
    if (!(await hasColumn("matches", "scheduled_time"))) {
      console.log("Adding scheduled_time to matches table...");
      await connection.execute(`ALTER TABLE matches ADD COLUMN scheduled_time DATETIME NULL`);
    }

    // Migrating users.is_verified
    if (!(await hasColumn("users", "is_verified"))) {
      console.log("Adding is_verified to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0`);
    }

    // Migrating users.otp_code
    if (!(await hasColumn("users", "otp_code"))) {
      console.log("Adding otp_code to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN otp_code VARCHAR(6) NULL`);
    }

    // Migrating users.otp_expires_at
    if (!(await hasColumn("users", "otp_expires_at"))) {
      console.log("Adding otp_expires_at to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL`);
    }

    // Migrating users.is_premium
    if (!(await hasColumn("users", "is_premium"))) {
      console.log("Adding is_premium to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0`);
    }

    // Migrating users.level
    if (!(await hasColumn("users", "level"))) {
      console.log("Adding level to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN level INT NOT NULL DEFAULT 1`);
    }

    // Migrating users.xp
    if (!(await hasColumn("users", "xp"))) {
      console.log("Adding xp to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN xp INT NOT NULL DEFAULT 0`);
    }

    // Migrating users.coins
    if (!(await hasColumn("users", "coins"))) {
      console.log("Adding coins to users table...");
      await connection.execute(`ALTER TABLE users ADD COLUMN coins INT NOT NULL DEFAULT 0`);
    }

    console.log("All database migrations verified and applied.");
  } catch (error) {
    console.error("Failed to create database schema:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
