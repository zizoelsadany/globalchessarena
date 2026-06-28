import { pool } from "./config/db.js";

async function run() {
  try {
    console.log("Adding is_deleted column to user_analysis_requests...");
    await pool.execute("ALTER TABLE user_analysis_requests ADD COLUMN is_deleted TINYINT(1) DEFAULT 0");
    console.log("Column added successfully!");
  } catch (error) {
    if (error.message.includes("Duplicate column name") || error.message.includes("already exists")) {
      console.log("Column is_deleted already exists.");
    } else {
      console.error("Migration failed:", error);
    }
  } finally {
    process.exit(0);
  }
}

run();
