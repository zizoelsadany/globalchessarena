import { parentPort, workerData } from "worker_threads";
import dotenv from "dotenv";
import { analyzeMatchWithStockfish } from "../utils/stockfish.js";

dotenv.config();

const { moves, options } = workerData;

analyzeMatchWithStockfish(moves, options)
  .then((result) => {
    parentPort.postMessage({ success: true, result });
  })
  .catch((error) => {
    parentPort.postMessage({
      success: false,
      error: error?.message || "Stockfish analysis failed"
    });
  });
