import { spawn } from "child_process";
import { existsSync } from "fs";
import dotenv from "dotenv";

dotenv.config();

export function createEngine() {
  const enginePath = process.env.STOCKFISH_PATH;
  if (!enginePath) {
    throw new Error("STOCKFISH_PATH is not configured");
  }
  if (!existsSync(enginePath)) {
    throw new Error(`Stockfish executable not found at ${enginePath}`);
  }

  return spawn(enginePath, [], {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"]
  });
}
