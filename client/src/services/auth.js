import { api, clearSession, setSession } from "./api.js";

export async function loginUser(credentials) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
  setSession(data);
  return data;
}

export async function registerUser(payload) {
  const data = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setSession(data);
  return data;
}

export async function fetchMe() {
  return api("/auth/me");
}

export function logoutUser() {
  clearSession();
}
