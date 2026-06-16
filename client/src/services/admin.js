import { api } from "./api.js";

export async function fetchAdminDashboard() {
  return api("/admin/dashboard");
}

export async function fetchAllUsers() {
  return api("/admin/users");
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

export async function resolveReport(reportId, status = "resolved") {
  return api(`/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function createNotification(message) {
  return api("/admin/notifications", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export async function createTournament(payload) {
  return api("/admin/tournaments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateTournament(tournamentId, payload) {
  return api(`/admin/tournaments/${tournamentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteTournament(tournamentId) {
  return api(`/admin/tournaments/${tournamentId}`, {
    method: "DELETE"
  });
}
