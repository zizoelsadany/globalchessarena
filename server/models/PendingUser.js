import { pool } from "../config/db.js";

export async function createPendingUser({ username, email, passwordHash, avatar, otpCode, otpExpiresAt }) {
  // First clean up any existing pending user with the same email or username
  await deletePendingUserByEmail(email);
  await deletePendingUserByUsername(username);

  const [result] = await pool.execute(
    "INSERT INTO pending_users (username, email, password, avatar, otp_code, otp_expires_at) VALUES (:username, :email, :password, :avatar, :otpCode, :otpExpiresAt)",
    { username, email, password: passwordHash, avatar: avatar || null, otpCode, otpExpiresAt }
  );
  return findPendingUserById(result.insertId);
}

export async function findPendingUserById(id) {
  const [rows] = await pool.execute("SELECT * FROM pending_users WHERE id = :id LIMIT 1", { id });
  return rows[0] || null;
}

export async function findPendingUserByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM pending_users WHERE email = :email LIMIT 1", { email });
  return rows[0] || null;
}

export async function findPendingUserByUsername(username) {
  const [rows] = await pool.execute("SELECT * FROM pending_users WHERE username = :username LIMIT 1", { username });
  return rows[0] || null;
}

export async function deletePendingUserByEmail(email) {
  await pool.execute("DELETE FROM pending_users WHERE email = :email", { email });
}

export async function deletePendingUserByUsername(username) {
  await pool.execute("DELETE FROM pending_users WHERE username = :username", { username });
}

export async function updatePendingUserOtp(email, otpCode, otpExpiresAt) {
  await pool.execute(
    "UPDATE pending_users SET otp_code = :otpCode, otp_expires_at = :otpExpiresAt WHERE email = :email",
    { email, otpCode, otpExpiresAt }
  );
}
