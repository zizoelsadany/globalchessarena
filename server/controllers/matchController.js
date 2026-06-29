import { getMatchById, listMatchesForUser, deleteMatch } from "../models/Match.js";
import { listMovesForMatch } from "../models/Move.js";
import { analyzeMatchInWorker } from "../services/analysisService.js";
import { pool } from "../config/db.js";

export async function myMatches(req, res, next) {
  try {
    const userId = req.user.id;
    const matches = await listMatchesForUser(userId);

    // Get list of match_ids that are soft-deleted for this user or by admin
    const [deletedRows] = await pool.execute(
      "SELECT DISTINCT match_id FROM user_analysis_requests WHERE is_deleted = 1 AND (user_id = :userId OR is_deleted = 1)",
      { userId }
    );
    const deletedMatchIds = new Set(deletedRows.map(r => r.match_id));

    // Filter out matches whose analysis was deleted
    const filteredMatches = matches.filter(m => !deletedMatchIds.has(m.id));

    res.json({ matches: filteredMatches });
  } catch (error) {
    next(error);
  }
}

export async function matchDetails(req, res, next) {
  try {
    const match = await getMatchById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.white_player !== req.user.id && match.black_player !== req.user.id) {
      return res.status(403).json({ message: "You are not allowed to view this match" });
    }
    const moves = await listMovesForMatch(req.params.id);
    res.json({ match, moves });
  } catch (error) {
    next(error);
  }
}

export async function matchAnalysis(req, res, next) {
  try {
    const match = await getMatchById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.white_player !== req.user.id && match.black_player !== req.user.id) {
      return res.status(403).json({ message: "You are not allowed to view this match" });
    }

    // Check if the analysis for this match was deleted by the admin
    const [deletedRequests] = await pool.execute(
      "SELECT id FROM user_analysis_requests WHERE match_id = :matchId AND is_deleted = 1",
      { matchId: req.params.id }
    );
    if (deletedRequests.length > 0) {
      return res.status(403).json({
        message: "This analysis was deleted by the administrator. / تم حذف هذا التحليل بواسطة مسؤول الموقع."
      });
    }

    if (!match.end_time && !match.result) {
      return res.status(400).json({ message: "Match has not finished yet" });
    }
    const moves = await listMovesForMatch(req.params.id);
    let stockfish = null;
    let stockfishError = null;
    try {
      stockfish = await analyzeMatchInWorker(moves, {
        depth: 10,
        maxPositions: 14,
        movetime: 1000
      });

      // Log request upon successful analysis
      await pool.execute(
        "INSERT INTO user_analysis_requests (user_id, match_id, requested_at) VALUES (:userId, :matchId, CURDATE())",
        { userId: req.user.id, matchId: match.id }
      );
    } catch (analysisError) {
      console.error("Stockfish analysis failed:", analysisError);
      stockfishError = analysisError?.message || "Stockfish analysis failed";
    }

    res.json({ match, moves, stockfish, stockfishError });
  } catch (error) {
    next(error);
  }
}

export async function removeMatch(req, res, next) {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;
    const match = await getMatchById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.white_player !== userId && match.black_player !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not allowed to delete this match" });
    }

    // Check if there is an existing analysis request
    const [existing] = await pool.execute(
      "SELECT id FROM user_analysis_requests WHERE user_id = :userId AND match_id = :matchId",
      { userId, matchId }
    );

    if (existing.length > 0) {
      await pool.execute(
        "UPDATE user_analysis_requests SET is_deleted = 1 WHERE user_id = :userId AND match_id = :matchId",
        { userId, matchId }
      );
    } else {
      await pool.execute(
        "INSERT INTO user_analysis_requests (user_id, match_id, requested_at, is_deleted) VALUES (:userId, :matchId, CURDATE(), 1)",
        { userId, matchId }
      );
    }

    res.json({ success: true, message: "Analysis removed / تم إزالة التحليل." });
  } catch (error) {
    next(error);
  }
}

export async function createComputerMatch(req, res, next) {
  try {
    const userId = req.user.id;
    const { result, reason } = req.body;

    // 1. Find the Computer user ID
    const [botRows] = await pool.execute("SELECT id FROM users WHERE username = 'Computer' LIMIT 1");
    if (botRows.length === 0) {
      return res.status(500).json({ message: "Computer bot user not found in database" });
    }
    const computerId = botRows[0].id;

    // 2. Insert match record
    const [matchResult] = await pool.execute(
      "INSERT INTO matches (white_player, black_player, result, reason, end_time) VALUES (:whitePlayer, :blackPlayer, :result, :reason, UTC_TIMESTAMP())",
      { 
        whitePlayer: userId, 
        blackPlayer: computerId, 
        result: result || null, 
        reason: reason || null 
      }
    );

    res.json({ success: true, matchId: matchResult.insertId });
  } catch (error) {
    next(error);
  }
}
