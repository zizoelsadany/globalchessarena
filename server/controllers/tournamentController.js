import { getTournamentById, joinTournament as joinTournamentModel, listTournaments } from "../models/Tournament.js";

export async function getTournaments(req, res, next) {
  try {
    const tournaments = await listTournaments({ limit: 20, userId: req.user.id });
    res.json({ tournaments });
  } catch (error) {
    next(error);
  }
}

export async function joinTournament(req, res, next) {
  try {
    const tournament = await getTournamentById(req.params.id, req.user.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    const joinedTournament = await joinTournamentModel(req.user.id, req.params.id);
    res.json({ tournament: joinedTournament });
  } catch (error) {
    next(error);
  }
}
