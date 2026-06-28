import { api } from "./api.js";

export async function trackVisit() {
  try {
    await fetch(import.meta.env.VITE_API_URL.replace("/api", "") + "/api/track-visit", { method: "POST" });
  } catch (_) {
    // silently fail - non critical
  }
}

export async function resetSiteVisits() {
  return api("/admin/dashboard/reset-visits", { method: "POST" });
}

export async function fetchAdminDashboard() {
  const data = await api("/admin/dashboard");
  return {
    users: Array.isArray(data.users) ? data.users : [],
    matches: Array.isArray(data.matches) ? data.matches : [],
    reports: Array.isArray(data.reports) ? data.reports : [],
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    tournaments: Array.isArray(data.tournaments) ? data.tournaments : [],
    openReportCount: typeof data.openReportCount === "number" ? data.openReportCount : 0,
    totalMatches: typeof data.totalMatches === "number" ? data.totalMatches : 0,
    siteVisits: typeof data.siteVisits === "number" ? data.siteVisits : 0
  };
}

export async function fetchAllUsers() {
  const data = await api("/admin/users");
  return Array.isArray(data.users) ? data.users : [];
}

export async function deleteUser(userId) {
  return api(`/admin/users/${userId}`, { method: "DELETE" });
}

export async function banUser(userId) {
  return api(`/admin/users/${userId}/ban`, { method: "POST" });
}

export async function unbanUser(userId) {
  return api(`/admin/users/${userId}/unban`, { method: "POST" });
}

export async function toggleUserPremium(userId) {
  return api(`/admin/users/${userId}/toggle-premium`, { method: "POST" });
}

export async function resolveReport(reportId, status = "resolved") {
  return api(`/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function fetchReports() {
  const data = await api("/admin/reports");
  return Array.isArray(data.reports) ? data.reports : [];
}

export async function createNotification(message, targetUserId = null, sendEmail = false) {
  return api("/admin/notifications", {
    method: "POST",
    body: JSON.stringify({ message, targetUserId, sendEmail })
  });
}

export async function broadcastNotification(message, targetUserId) {
  return api("/notifications/broadcast", {
    method: "POST",
    body: JSON.stringify({ message, targetUserId })
  });
}

export async function createTournament(payload) {
  return api("/admin/tournaments", {
    method: "POST",
    body: payload instanceof FormData ? payload : JSON.stringify(payload)
  });
}

export async function updateTournament(tournamentId, payload) {
  return api(`/admin/tournaments/${tournamentId}`, {
    method: "PATCH",
    body: payload instanceof FormData ? payload : JSON.stringify(payload)
  });
}

export async function createTournamentMatch(tournamentId, payload) {
  return api(`/admin/tournaments/${tournamentId}/matches`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteTournament(tournamentId) {
  return api(`/admin/tournaments/${tournamentId}`, {
    method: "DELETE"
  });
}

export async function fetchAnalyses() {
  const data = await api("/admin/analyses");
  return Array.isArray(data.analyses) ? data.analyses : [];
}

export async function deleteAnalysis(analysisId) {
  return api(`/admin/analyses/${analysisId}`, { method: "DELETE" });
}

export async function deleteAllAnalyses() {
  return api("/admin/analyses", { method: "DELETE" });
}
