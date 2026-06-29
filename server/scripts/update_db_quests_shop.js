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
  console.log("Updating database schema for Quests and Shop using config:", {
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
    // 1. Modify users.level to DECIMAL(5,1)
    await pool.execute("ALTER TABLE users MODIFY COLUMN level DECIMAL(5,1) NOT NULL DEFAULT 1.0");
    console.log("Modified level column in users table to DECIMAL(5,1).");

    // 2. Create user_quests table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quest_key VARCHAR(50) NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        target_value INT NOT NULL DEFAULT 1,
        current_value INT NOT NULL DEFAULT 0,
        is_completed TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Created/Verified user_quests table.");

    // 3. Create user_items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        item_value VARCHAR(100) NOT NULL,
        purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_item (user_id, item_type, item_value)
      )
    `);
    console.log("Created/Verified user_items table.");

    console.log("Database schema for Quests and Shop updated successfully!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Error updating database schema:", error);
    process.exit(1);
  }
}

updateDb();
