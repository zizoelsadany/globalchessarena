import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { createUser, findUserByEmail, findUserWithPasswordById, setUserOtp, verifyUser, updateUserProfile, findUserByUsername } from "../models/User.js";
import { signToken } from "../utils/tokens.js";
import { OAuth2Client } from "google-auth-library";
import { sendWelcomeEmail, sendOtpEmail, sendForgotPasswordEmail } from "../services/emailService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "940530069798-btep8vnv8d38hakcjp8237higegtqfll.apps.googleusercontent.com");

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

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().length(6, "OTP must be exactly 6 digits")
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email()
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(8).max(128)
});

export async function register(req, res, next) {
  try {
    const existingEmail = await findUserByEmail(req.body.email);
    if (existingEmail) return res.status(409).json({ message: "Email is already registered" });

    const existingUsername = await findUserByUsername(req.body.username);
    if (existingUsername) return res.status(409).json({ message: "Username is already taken" });

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    
    // Generate a 6-digit OTP code and expiry (15 mins from now)
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await createUser({
      username: req.body.username,
      email: req.body.email,
      passwordHash,
      avatar: req.body.avatar || null,
      is_verified: 0,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt
    });

    await sendOtpEmail(user.email, user.username, otpCode);

    res.status(201).json({ user: { ...user, hasPassword: true }, token: signToken(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("email")) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      return res.status(409).json({ message: "Username is already taken" });
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

    const { password, ...userWithoutPassword } = userWithPassword;
    res.json({ user: { ...userWithoutPassword, hasPassword: true }, token: signToken(userWithoutPassword) });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  const userWithPassword = await findUserWithPasswordById(req.user.id);
  const hasPassword = userWithPassword?.password !== "GOOGLE_AUTH";
  res.json({ user: { ...req.user, hasPassword } });
}

export async function googleLogin(req, res, next) {
  try {
    const { credential, access_token } = req.body;
    let email, username, picture;

    if (access_token) {
      // Custom button sends access_token
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch user info from Google");
      const payload = await response.json();
      email = payload.email;
      username = payload.name.replace(/\s+/g, '_').substring(0, 32);
      picture = payload.picture;
    } else {
      // Standard GoogleLogin sends credential
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || "940530069798-btep8vnv8d38hakcjp8237higegtqfll.apps.googleusercontent.com",
      });
      const payload = ticket.getPayload();
      email = payload.email;
      username = payload.name.replace(/\s+/g, '_').substring(0, 32);
      picture = payload.picture;
    }

    let user = await findUserByEmail(email);
    if (!user) {
      // Create user if not exists
      user = await createUser({
        username: username,
        email: email,
        passwordHash: "GOOGLE_AUTH",
        avatar: null,
        is_verified: 1
      });
      
      sendWelcomeEmail(user.email, user.username);
    } else {
      if (user.status !== "active") {
         return res.status(403).json({ message: "Your account has been banned" });
      }
      if (!user.is_verified) {
        await verifyUser(user.id);
      }
    }

    // Removing password field
    const { password, ...userWithoutPassword } = await findUserByEmail(email);

    res.json({ user: { ...userWithoutPassword, hasPassword: false }, token: signToken(userWithoutPassword) });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Invalid Google credentials" });
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.is_verified) {
      return res.json({ message: "Account is already verified", user });
    }

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const expiry = new Date(user.otp_expires_at);
    if (expiry < new Date()) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    await verifyUser(user.id);
    
    // Send welcome email after they are verified!
    sendWelcomeEmail(user.email, user.username);

    const updatedUser = await findUserByEmail(email);
    res.json({ message: "Account verified successfully", user: updatedUser, token: signToken(updatedUser) });
  } catch (error) {
    next(error);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.is_verified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await setUserOtp(email, otpCode, otpExpiresAt);
    await sendOtpEmail(email, user.username, otpCode);

    res.json({ message: "Verification code resent successfully" });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await setUserOtp(email, otpCode, otpExpiresAt);
    await sendForgotPasswordEmail(email, user.username, otpCode);

    res.json({ message: "Password reset code sent successfully" });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    const userWithPass = await findUserByEmail(email);
    if (!userWithPass) return res.status(404).json({ message: "User not found" });

    if (!userWithPass.otp_code || userWithPass.otp_code !== otp) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    const expiry = new Date(userWithPass.otp_expires_at);
    if (expiry < new Date()) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    await updateUserProfile(userWithPass.id, { password: passwordHash });
    await verifyUser(userWithPass.id); // verifies user and clears otp code / expiry

    res.json({ message: "Password has been reset successfully. You can now log in." });
  } catch (error) {
    next(error);
  }
}
