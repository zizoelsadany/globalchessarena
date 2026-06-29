const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const API_URL = isLocalhost ? "http://localhost:5000/api" : (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api"));

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
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
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

export function normalizeAssetUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/.test(url)) return url;

  const origin = new URL(API_URL, typeof window !== "undefined" ? window.location.origin : "").origin;
  return url.startsWith("/") ? `${origin}${url}` : url;
}
