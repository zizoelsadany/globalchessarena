import { getTournamentById, joinTournament as joinTournamentModel, listTournaments, getTournamentMatches as getMatchesModel, getTournamentParticipants as getParticipantsModel } from "../models/Tournament.js";

export async function getTournaments(req, res, next) {
  try {
    const list = await listTournaments({ limit: 50 });
    // Map with joined status for the current user
    const tournaments = await Promise.all(
      list.map(async (t) => {
        const detail = await getTournamentById(t.id, req.user.id);
        if (detail && detail.logo_url && detail.logo_url.startsWith("/")) {
          const origin = `${req.protocol}://${req.get("host")}`;
          detail.logo_url = `${origin}${detail.logo_url}`;
        }
        return detail;
      })
    );
    res.json({ tournaments });
  } catch (error) {
    next(error);
  }
}

export async function getTournamentDetails(req, res, next) {
  try {
    const tournament = await getTournamentById(req.params.id, req.user.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    if (tournament && tournament.logo_url && tournament.logo_url.startsWith("/")) {
      const origin = `${req.protocol}://${req.get("host")}`;
      tournament.logo_url = `${origin}${tournament.logo_url}`;
    }
    res.json({ tournament });
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

export async function getTournamentMatches(req, res, next) {
  try {
    const matches = await getMatchesModel(req.params.id);
    res.json({ matches });
  } catch (error) {
    next(error);
  }
}

export async function getTournamentParticipants(req, res, next) {
  try {
    const participants = await getParticipantsModel(req.params.id);
    res.json({ participants });
  } catch (error) {
    next(error);
  }
}

