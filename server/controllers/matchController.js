import { getMatchById, listMatchesForUser } from "../models/Match.js";
import { listMovesForMatch } from "../models/Move.js";

export async function myMatches(req, res, next) {
  try {
    const matches = await listMatchesForUser(req.user.id);
    res.json({ matches });
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
