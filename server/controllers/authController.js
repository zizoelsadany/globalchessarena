import bcrypt from "bcrypt";
import { z } from "zod";
import { createUser, findUserByEmail } from "../models/User.js";
import { signToken } from "../utils/tokens.js";

const avatarSchema = z
  .enum(["crown", "knight", "rook", "pawn", "bishop", "queen"])
  .or(z.string().url().max(500))
  .optional()
  .or(z.literal(""));

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[\p{L}\p{N}_]+$/u, "Use letters, numbers, or underscores only"),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  avatar: avatarSchema
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function register(req, res, next) {
  try {
    const existing = await findUserByEmail(req.body.email);
    if (existing) return res.status(409).json({ message: "Email is already registered" });

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await createUser({
      username: req.body.username,
      email: req.body.email,
      passwordHash,
      avatar: req.body.avatar || null
    });

    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username or email already exists" });
    }
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const userWithPassword = await findUserByEmail(req.body.email);
    if (!userWithPassword) return res.status(401).json({ message: "Invalid credentials" });
    if (userWithPassword.status !== "active") return res.status(403).json({ message: "Your account has been banned" });

    const isValid = await bcrypt.compare(req.body.password, userWithPassword.password);
    if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

    const { password, ...user } = userWithPassword;
    res.json({ user, token: signToken(user) });
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({ user: req.user });
}
