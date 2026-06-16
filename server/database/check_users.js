import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "global_chess_arena"
  });

  try {
    const [rows] = await connection.execute("SELECT id, username, email, elo_rating FROM users");
    console.log("Current Users in DB:", rows);
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

main();
