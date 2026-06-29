import { pool } from "../config/db.js";

const publicFields = "id, username, email, elo_rating, avatar, invite_code, role, status, is_verified, is_premium, level, xp, coins, created_at";

function generateRandomSixDigitCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

async function generateUniqueInviteCode() {
  let code;
  let attempts = 0;
  do {
    code = generateRandomSixDigitCode();
    const [rows] = await pool.execute("SELECT 1 FROM users WHERE invite_code = :inviteCode LIMIT 1", { inviteCode: code });
    if (!rows.length) return code;
    attempts += 1;
  } while (attempts < 10);
  throw new Error("Unable to generate a unique user code. Please try again.");
}

export async function createUser({ username, email, passwordHash, avatar, role = "player", is_verified = 0, otp_code = null, otp_expires_at = null }) {
  const invite_code = await generateUniqueInviteCode();
  const [result] = await pool.execute(
    "INSERT INTO users (username, email, password, avatar, role, invite_code, is_verified, otp_code, otp_expires_at) VALUES (:username, :email, :password, :avatar, :role, :invite_code, :is_verified, :otp_code, :otp_expires_at)",
    { username, email, password: passwordHash, avatar: avatar || null, role, invite_code, is_verified, otp_code, otp_expires_at }
  );
  return findUserById(result.insertId);
}

export async function findUserByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = :email LIMIT 1", { email });
  return rows[0] || null;
}

export async function findUserByUsername(username) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE username = :username LIMIT 1", { username });
  return rows[0] || null;
}

export async function findUserByInviteCode(inviteCode) {
  const [rows] = await pool.execute(
    `SELECT ${publicFields} FROM users WHERE invite_code = :inviteCode LIMIT 1`,
    { inviteCode }
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.execute(`SELECT ${publicFields} FROM users WHERE id = :id LIMIT 1`, { id });
  return rows[0] || null;
}

export async function findUserWithPasswordById(id) {
  const [rows] = await pool.execute(`SELECT * FROM users WHERE id = :id LIMIT 1`, { id });
  return rows[0] || null;
}

export async function listUsers({ limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const [rows] = await pool.execute(
    `SELECT ${publicFields} FROM users ORDER BY elo_rating DESC, username ASC LIMIT ${safeLimit}`
  );
  return rows;
}

export async function listAllUsers({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [rows] = await pool.execute(
    `SELECT ${publicFields} FROM users ORDER BY created_at DESC LIMIT ${safeLimit}`
  );
  return rows;
}

export async function deleteUserById(id) {
  await pool.execute("DELETE FROM users WHERE id = :id", { id });
}

export async function banUserById(id) {
  await pool.execute("UPDATE users SET status = 'banned' WHERE id = :id", { id });
}

export async function unbanUserById(id) {
  await pool.execute("UPDATE users SET status = 'active' WHERE id = :id", { id });
}

export async function updateUserProfile(id, { username, email, password, avatar }) {
  const updates = [];
  const params = { id };

  if (username !== undefined) { updates.push("username = :username"); params.username = username || null; }
  if (email !== undefined) { updates.push("email = :email"); params.email = email; }
  if (password !== undefined) { updates.push("password = :password"); params.password = password; }
  if (avatar !== undefined) { updates.push("avatar = :avatar"); params.avatar = avatar || null; }

  if (updates.length > 0) {
    await pool.execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = :id`,
      params
    );
  }
  return findUserById(id);
}

export async function updateRatings([{ userId, rating }, { userId: otherUserId, rating: otherRating }]) {
  await pool.execute(
    "UPDATE users SET elo_rating = CASE id WHEN :userId THEN :rating WHEN :otherUserId THEN :otherRating END WHERE id IN (:userId, :otherUserId)",
    { userId, rating, otherUserId, otherRating }
  );
}

export async function setUserOtp(email, otpCode, otpExpiresAt) {
  await pool.execute(
    "UPDATE users SET otp_code = :otpCode, otp_expires_at = :otpExpiresAt WHERE email = :email",
    { email, otpCode, otpExpiresAt }
  );
}

export async function verifyUser(id) {
  await pool.execute(
    "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = :id",
    { id }
  );
}

export async function awardTournamentWinner(userId, xpGain = 500) {
  await pool.execute(
    "UPDATE users SET level = level + 1, xp = xp + :xpGain WHERE id = :userId",
    { userId, xpGain }
  );
}
