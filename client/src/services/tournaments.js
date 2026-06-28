import { api } from "./api.js";

export async function fetchTournaments() {
  const data = await api("/tournaments");
  return Array.isArray(data.tournaments) ? data.tournaments : [];
}

export async function joinTournament(tournamentId) {
  return api(`/tournaments/${tournamentId}/join`, { method: "POST" });
}

export async function fetchTournamentDetails(tournamentId) {
  const data = await api(`/tournaments/${tournamentId}`);
  return data.tournament || null;
}

export async function fetchTournamentParticipants(tournamentId) {
  const data = await api(`/tournaments/${tournamentId}/participants`);
  return Array.isArray(data.participants) ? data.participants : [];
}

export async function fetchTournamentMatches(tournamentId) {
  const data = await api(`/tournaments/${tournamentId}/matches`);
  return Array.isArray(data.matches) ? data.matches : [];
}
