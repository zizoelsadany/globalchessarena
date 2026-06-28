import { api, clearSession, setSession } from "./api.js";

export async function loginUser(credentials) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
  setSession(data);
  return data;
}

export async function googleLoginUser(token) {
  const data = await api("/auth/google", {
    method: "POST",
    body: JSON.stringify(token.startsWith("ya29.") ? { access_token: token } : { credential: token })
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

export async function verifyOtpUser(email, otp) {
  const data = await api("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
  });
  if (data.token && data.user) {
    setSession(data);
  }
  return data;
}

export async function resendOtpCode(email) {
  return await api("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function forgotPassword(email) {
  return await api("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(email, otp, newPassword) {
  return await api("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword })
  });
}
