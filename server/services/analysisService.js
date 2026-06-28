import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, "../workers/analysisWorker.js");

const MAX_DEPTH = 10;
const MAX_MOVETIME_MS = 1000;

export function analyzeMatchInWorker(moves, options = {}) {
  const workerOptions = {
    depth: Math.min(Number(options.depth) || MAX_DEPTH, MAX_DEPTH),
    maxPositions: options.maxPositions ?? 14,
    movetime: Math.min(Number(options.movetime) || MAX_MOVETIME_MS, MAX_MOVETIME_MS)
  };

  return new Promise((resolve, reject) => {
    let settled = false;

    const worker = new Worker(WORKER_PATH, {
      workerData: { moves, options: workerOptions }
    });

    const finish = (handler) => {
      if (settled) return;
      settled = true;
      worker.terminate().catch(() => {});
      handler();
    };

    worker.on("message", (msg) => {
      if (msg.success) {
        finish(() => resolve(msg.result));
      } else {
        finish(() => reject(new Error(msg.error || "Analysis worker failed")));
      }
    });

    worker.on("error", (err) => {
      finish(() => reject(err));
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        finish(() => reject(new Error(`Analysis worker exited with code ${code}`)));
      }
    });
  });
}
