import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "global_chess_arena"
};

async function updateDb() {
  console.log("Updating database schema for manual payments using config:", {
    ...dbConfig,
    password: dbConfig.password ? "****" : "(none)"
  });

  const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 2,
    namedPlaceholders: true
  });

  try {
    // Add columns to payments table if they don't exist
    const [columns] = await pool.execute("SHOW COLUMNS FROM payments");
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes("receipt_url")) {
      await pool.execute("ALTER TABLE payments ADD COLUMN receipt_url VARCHAR(500) NULL");
      console.log("Added column: receipt_url");
    }

    if (!columnNames.includes("sender_number")) {
      await pool.execute("ALTER TABLE payments ADD COLUMN sender_number VARCHAR(50) NULL");
      console.log("Added column: sender_number");
    }

    if (!columnNames.includes("transaction_id")) {
      await pool.execute("ALTER TABLE payments ADD COLUMN transaction_id VARCHAR(100) NULL");
      console.log("Added column: transaction_id");
    }

    if (!columnNames.includes("payment_method")) {
      await pool.execute("ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'manual'");
      console.log("Added column: payment_method");
    }

    if (!columnNames.includes("coins_amount")) {
      await pool.execute("ALTER TABLE payments ADD COLUMN coins_amount INT NOT NULL DEFAULT 0");
      console.log("Added column: coins_amount");
    }

    // Set admin users' coins to 10,000,000
    await pool.execute("UPDATE users SET coins = 10000000 WHERE role = 'admin'");
    console.log("Updated admin users' coins to 10,000,000.");

    // Ensure Computer bot user exists
    const [botRows] = await pool.execute("SELECT id FROM users WHERE username = 'Computer'");
    if (botRows.length === 0) {
      await pool.execute(
        "INSERT INTO users (username, email, password, role, invite_code, is_verified) VALUES ('Computer', 'computer@globalchessarena.local', 'bot_pass_placeholder', 'player', 'BOTINV', 1)"
      );
      console.log("Created 'Computer' bot user in database.");
    } else {
      console.log("'Computer' bot user already exists.");
    }

    console.log("Database schema updated successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error updating database schema:", error);
    process.exit(1);
  }
}

updateDb();
