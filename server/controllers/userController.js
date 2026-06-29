import bcrypt from "bcrypt";
import { z } from "zod";
import { findUserById, findUserWithPasswordById, listUsers, updateUserProfile } from "../models/User.js";
import { emailSchema } from "./authController.js";

const avatarSchema = z
  .enum(["crown", "knight", "rook", "pawn", "bishop", "queen", "avatar_king", "avatar_wizard"])
  .or(z.string().url().max(500))
  .optional()
  .or(z.literal(""));

export const profileSchema = z.object({
  username: z.string().trim().min(3).max(16).regex(/^[a-zA-Z0-9_]+$/, "Username must contain only English letters, numbers, or underscores (3-16 characters) / يجب أن يحتوي اسم المستخدم على حروف إنجليزية، أرقام أو شرطة سفلية فقط (3-16 حرف)").optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  currentPassword: z.string().optional().or(z.literal("")),
  newPassword: z.string().min(8).max(128).optional().or(z.literal("")),
  avatar: avatarSchema
});

export async function getProfile(req, res, next) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { username, email, currentPassword, newPassword, avatar } = req.body;
    let passwordHash;

    if (newPassword && newPassword.length > 0) {
      const userWithPassword = await findUserWithPasswordById(req.user.id);
      
      // If user registered via Google, they might have the "GOOGLE_AUTH" placeholder password
      if (userWithPassword.password !== "GOOGLE_AUTH") {
        if (!currentPassword) return res.status(400).json({ message: "Current password is required to set a new password" });
        const isValid = await bcrypt.compare(currentPassword, userWithPassword.password);
        if (!isValid) return res.status(401).json({ message: "Incorrect current password" });
      }
      
      passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const user = await updateUserProfile(req.user.id, {
      username: username || undefined,
      email: email || undefined,
      password: passwordHash,
      avatar: avatar !== undefined ? avatar : undefined
    });
    res.json({ user });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username or email is already taken" });
    }
    next(error);
  }
}

export async function leaderboard(req, res, next) {
  try {
    const users = await listUsers({ limit: 100 });
    // Hide 'Computer' user from leaderboard
    const filteredUsers = users.filter((u) => u.username !== "Computer");
    // If the requester is an admin, return full list; otherwise hide admin accounts
    const isAdmin = req.user && req.user.role === "admin";
    const result = isAdmin ? filteredUsers : filteredUsers.filter((u) => u.role !== "admin");
    res.json({ users: result });
  } catch (error) {
    next(error);
  }
}
