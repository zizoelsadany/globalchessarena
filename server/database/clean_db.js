import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

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
    console.log("Deleting all users except 'Abdelaziz'...");
    const [delRes] = await connection.execute(
      "DELETE FROM users WHERE LOWER(username) != 'abdelaziz'"
    );
    console.log(`Deleted users count: ${delRes.affectedRows}`);

    console.log("Setting Elo ratings of remaining users to 0...");
    const [updRes] = await connection.execute(
      "UPDATE users SET elo_rating = 0"
    );
    console.log(`Updated users count: ${updRes.affectedRows}`);

    console.log("Modifying table default ELO to 0...");
    await connection.execute(
      "ALTER TABLE users MODIFY elo_rating INT NOT NULL DEFAULT 0"
    );
    console.log("Database default ELO altered successfully to 0!");

  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    await connection.end();
    console.log("Database connection closed.");
  }
}

main();
