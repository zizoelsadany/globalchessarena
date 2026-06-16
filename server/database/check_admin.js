import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ? process.env.DB_HOST : "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER ? process.env.DB_USER : "root",
  password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD : "",
  database: process.env.DB_NAME ? process.env.DB_NAME : "global_chess_arena"
});

try {
  const [columns] = await connection.execute("SHOW COLUMNS FROM users");
  console.log("COLUMNS:");
  console.log(columns);
  const [adminRows] = await connection.execute("SELECT id, email, username, role, status FROM users WHERE email = ?", ["admin@chees.com"]);
  console.log("ADMIN ROWS:");
  console.log(adminRows);
} catch (err) {
  console.error(err);
} finally {
  await connection.end();
}
