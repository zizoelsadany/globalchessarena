const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

export function getToken() {
  return localStorage.getItem("gca_token");
}

export function setSession({ token, user }) {
  localStorage.setItem("gca_token", token);
  localStorage.setItem("gca_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("gca_token");
  localStorage.removeItem("gca_user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("gca_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearSession();
    return null;
  }
}

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data.errors
      ? Object.entries(data.errors)
          .filter(([, messages]) => messages?.length)
          .map(([field, messages]) => `${field}: ${messages[0]}`)
          .join("\n")
      : "";
    throw new Error(details || data.message || "Request failed");
  }
  return data;
}
