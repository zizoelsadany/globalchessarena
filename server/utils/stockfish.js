import { Chess } from "chess.js";
import { createEngine } from "../services/stockfishEngine.js";

const MAX_DEPTH = 10;
const MAX_MOVETIME_MS = 1000;

function attachEngineListeners(engine) {
  const lines = [];
  const waiters = [];
  let buffer = "";

  const processLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    lines.push(trimmed);
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const waiter = waiters[i];
      if (waiter.predicate(trimmed)) {
        clearTimeout(waiter.timer);
        waiter.resolve(trimmed);
        waiters.splice(i, 1);
      }
    }
  };

  engine.stdout.on("data", (data) => {
    buffer += data.toString();
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      processLine(part);
    }
  });

  engine.stderr.on("data", (data) => {
    console.error("[Stockfish stderr]", data.toString().trim());
  });

  const rejectAllWaiters = (error) => {
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    waiters.length = 0;
  };

  engine.on("error", (err) => {
    console.error("[Stockfish process error]", err.message);
    rejectAllWaiters(new Error(`Stockfish process error: ${err.message}`));
  });

  engine.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      rejectAllWaiters(
        new Error(`Stockfish exited unexpectedly (code ${code}${signal ? `, signal ${signal}` : ""})`)
      );
    }
  });

  const writeCommand = (cmd) => {
    if (!engine.stdin.writable) {
      throw new Error("Stockfish stdin is not writable");
    }
    engine.stdin.write(`${cmd}\n`);
  };

  const waitForLine = (predicate, timeout = 15000) => {
    const existing = lines.find(predicate);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = waiters.findIndex((waiter) => waiter.resolve === resolve);
        if (index !== -1) {
          waiters.splice(index, 1);
        }
        reject(new Error("Stockfish timed out waiting for output"));
      }, timeout);

      waiters.push({ predicate, resolve, reject, timer });
    });
  };

  return { lines, waitForLine, writeCommand, rejectAllWaiters };
}

function parseScore(tokens) {
  const score = { type: null, value: null };
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === "cp") {
      score.type = "cp";
      score.value = Number(tokens[i + 1]);
      break;
    }
    if (tokens[i] === "mate") {
      score.type = "mate";
      score.value = Number(tokens[i + 1]);
      break;
    }
  }
  return score.type ? score : null;
}

function parseInfoLine(line) {
  if (!line.startsWith("info")) return null;
  const tokens = line.trim().split(/\s+/);
  const info = { depth: null, seldepth: null, multipv: 1, score: null, pv: [] };

  for (let i = 1; i < tokens.length; i += 1) {
    switch (tokens[i]) {
      case "depth":
        info.depth = Number(tokens[i + 1]);
        i += 1;
        break;
      case "seldepth":
        info.seldepth = Number(tokens[i + 1]);
        i += 1;
        break;
      case "multipv":
        info.multipv = Number(tokens[i + 1]);
        i += 1;
        break;
      case "score":
        info.score = parseScore(tokens.slice(i + 1));
        if (info.score) {
          i += info.score.type === "cp" ? 2 : 2;
        }
        break;
      case "pv":
        info.pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
      default:
        break;
    }
  }

  return info;
}

function parseBestMove(line) {
  const tokens = line.trim().split(/\s+/);
  return tokens.length >= 2 ? tokens[1] : null;
}

function mapAnalysisPosition({ index, move, color, uciMove, fen, info, bestMove }) {
  return {
    index,
    moveNumber: index + 1,
    color,
    move,
    uciMove,
    fen,
    bestMove,
    score: info?.score || null,
    pv: info?.pv || []
  };
}

async function shutdownEngine(engine) {
  await new Promise((resolve) => {
    if (engine.killed) {
      resolve();
      return;
    }

    const forceKill = setTimeout(() => {
      if (!engine.killed) {
        engine.kill("SIGKILL");
      }
      resolve();
    }, 3000);

    engine.once("exit", () => {
      clearTimeout(forceKill);
      resolve();
    });

    try {
      if (engine.stdin.writable) {
        engine.stdin.write("quit\n");
      }
    } catch {
      // ignore
    }

    setTimeout(() => {
      if (!engine.killed) {
        engine.kill("SIGTERM");
      }
    }, 500);
  });
}

export async function analyzeMatchWithStockfish(
  moves,
  { depth = MAX_DEPTH, maxPositions = 20, movetime = MAX_MOVETIME_MS } = {}
) {
  const safeDepth = Math.min(Math.max(Number(depth) || MAX_DEPTH, 1), MAX_DEPTH);
  const safeMovetime = Math.min(Math.max(Number(movetime) || MAX_MOVETIME_MS, 1), MAX_MOVETIME_MS);

  let engine;
  let tracker;

  try {
    engine = createEngine();
  } catch (err) {
    throw new Error(`Failed to start Stockfish: ${err.message}`);
  }

  tracker = attachEngineListeners(engine);
  const { lines, waitForLine, writeCommand, rejectAllWaiters } = tracker;

  try {
    writeCommand("uci");
    await waitForLine((line) => line === "uciok");

    writeCommand("setoption name Threads value 1");
    writeCommand("isready");
    await waitForLine((line) => line === "readyok");

    writeCommand("ucinewgame");
    writeCommand("isready");
    await waitForLine((line) => line === "readyok");

    const chess = new Chess();
    const uciMoves = [];
    for (const mv of moves) {
      const move = chess.move(mv.move_notation, { sloppy: true });
      if (!move) {
        throw new Error(`Unable to parse move notation: ${mv.move_notation}`);
      }
      uciMoves.push(move.from + move.to + (move.promotion || ""));
    }

    const total = uciMoves.length;
    const selectedIndexes = [];

    if (total <= maxPositions) {
      for (let i = 0; i < total; i += 1) selectedIndexes.push(i);
    } else {
      const firstCount = Math.min(10, Math.floor(maxPositions / 2));
      const lastCount = Math.min(10, maxPositions - firstCount);
      for (let i = 0; i < firstCount; i += 1) selectedIndexes.push(i);
      for (let i = total - lastCount; i < total; i += 1) {
        if (i >= firstCount) selectedIndexes.push(i);
      }
    }

    const analysis = [];
    const searchTimeout = safeMovetime + 5000;

    for (const index of selectedIndexes) {
      const move = moves[index];
      const uciMove = uciMoves[index];
      const color = index % 2 === 0 ? "white" : "black";
      const positionMoves = uciMoves.slice(0, index + 1).join(" ");
      const beforeLen = lines.length;

      writeCommand(`position startpos moves ${positionMoves}`);
      writeCommand(`go depth ${safeDepth} movetime ${safeMovetime}`);
      await waitForLine((line) => line.startsWith("bestmove "), searchTimeout);

      const newLines = lines.slice(beforeLen);
      const infoLines = newLines.filter((line) => line.startsWith("info"));
      const lastInfo = infoLines.length > 0 ? parseInfoLine(infoLines[infoLines.length - 1]) : null;
      const bestLine = newLines.find((line) => line.startsWith("bestmove "));
      const bestMove = bestLine ? parseBestMove(bestLine) : null;

      const tempChess = new Chess();
      for (let i = 0; i <= index; i += 1) {
        tempChess.move(moves[i].move_notation, { sloppy: true });
      }

      analysis.push(
        mapAnalysisPosition({
          index,
          move: move.move_notation,
          color,
          uciMove,
          fen: tempChess.fen(),
          info: lastInfo,
          bestMove
        })
      );
    }

    return {
      engine: {
        name: "Stockfish",
        depth: safeDepth,
        movetimeMs: safeMovetime,
        positionsAnalyzed: analysis.length,
        totalMoves: total
      },
      positions: analysis
    };
  } catch (err) {
    rejectAllWaiters(err);
    throw err;
  } finally {
    await shutdownEngine(engine);
  }
}
