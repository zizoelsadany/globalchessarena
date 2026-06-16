import { api } from "./api.js";

export async function fetchTournaments() {
  return api("/tournaments");
}

export async function joinTournament(tournamentId) {
  return api(`/tournaments/${tournamentId}/join`, { method: "POST" });
}
