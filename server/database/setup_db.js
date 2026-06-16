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
    multipleStatements: true
  });

  try {
    console.log("Creating database schema from schema.sql...");
    await connection.query(schemaSql);
    console.log("Database schema created or verified successfully.");
  } catch (error) {
    console.error("Failed to create database schema:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
