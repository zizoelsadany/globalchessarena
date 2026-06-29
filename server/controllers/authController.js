import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { createUser, findUserByEmail, findUserWithPasswordById, setUserOtp, verifyUser, updateUserProfile, findUserByUsername } from "../models/User.js";
import { createPendingUser, findPendingUserByEmail, findPendingUserByUsername, deletePendingUserByEmail, updatePendingUserOtp } from "../models/PendingUser.js";
import { signToken } from "../utils/tokens.js";
import { OAuth2Client } from "google-auth-library";
import { sendWelcomeEmail, sendOtpEmail, sendForgotPasswordEmail } from "../services/emailService.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "940530069798-btep8vnv8d38hakcjp8237higegtqfll.apps.googleusercontent.com");

const avatarSchema = z
  .enum(["crown", "knight", "rook", "pawn", "bishop", "queen"])
  .or(z.string().url().max(500))
  .optional()
  .or(z.literal(""));

const blockedDomains = [
  "gmal.co", "gmal.com", "gamil.com", "gamil.co", "gmail.co", "gmail.con", "gmal.con", "gamil.con",
  "hotmal.com", "hotamil.com", "hotmial.com", "hotmail.co",
  "yaho.com", "yahoo.co",
  "outlok.com", "outlook.co"
];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("البريد الإلكتروني غير صالح / Invalid email address")
  .max(255)
  .refine(
    (val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val),
    {
      message: "نطاق البريد الإلكتروني غير صالح (يجب أن يكون الامتداد حرفين على الأقل مثل .com) / Invalid email domain (TLD must be at least 2 characters, e.g. .com)"
    }
  )
  .refine(
    (val) => {
      const domain = val.split("@")[1];
      return !blockedDomains.includes(domain);
    },
    {
      message: "خطأ إملائي في البريد الإلكتروني / Check email spelling"
    }
  );

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(16)
    .regex(/^[a-zA-Z0-9_]+$/, "Username must contain only English letters, numbers, or underscores (3-16 characters) / يجب أن يحتوي اسم المستخدم على حروف إنجليزية، أرقام أو شرطة سفلية فقط (3-16 حرف)"),
  email: emailSchema,
  password: z.string().min(8).max(128),
  avatar: avatarSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6, "OTP must be exactly 6 digits")
});

export const resendOtpSchema = z.object({
  email: emailSchema
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
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

    const pendingUser = await createPendingUser({
      username: req.body.username,
      email: req.body.email,
      passwordHash,
      avatar: req.body.avatar || null,
      otpCode,
      otpExpiresAt
    });

    await sendOtpEmail(pendingUser.email, pendingUser.username, otpCode);

    // Create a temporary token for the pending user so frontend can load VerifyOtp page safely
    const tempToken = jwt.sign({ sub: `pending:${pendingUser.id}`, username: pendingUser.username }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn
    });

    const mockUserPayload = {
      id: `pending:${pendingUser.id}`,
      username: pendingUser.username,
      email: pendingUser.email,
      avatar: pendingUser.avatar,
      is_verified: 0,
      is_premium: 0,
      level: 1,
      xp: 0,
      coins: 0,
      role: "player",
      status: "active"
    };

    res.status(201).json({ user: { ...mockUserPayload, hasPassword: true }, token: tempToken });
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
      // Resolve username collision if any
      let baseUsername = username;
      let counter = 1;
      while (await findUserByUsername(username) || await findPendingUserByUsername(username)) {
        username = `${baseUsername.substring(0, 12)}_${counter}`;
        counter++;
      }

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
    
    // Check if the user is already fully registered in the main users table
    const registeredUser = await findUserByEmail(email);
    if (registeredUser) {
      if (registeredUser.is_verified) {
        return res.json({ message: "Account is already verified", user: registeredUser, token: signToken(registeredUser) });
      }
      // If by some chance there's an unverified user in the main database, we handle it too:
      if (registeredUser.otp_code === otp) {
        const expiry = new Date(registeredUser.otp_expires_at);
        if (expiry >= new Date()) {
          await verifyUser(registeredUser.id);
          sendWelcomeEmail(registeredUser.email, registeredUser.username);
          const updatedUser = await findUserByEmail(email);
          return res.json({ message: "Account verified successfully", user: updatedUser, token: signToken(updatedUser) });
        }
      }
    }

    // Otherwise, check the pending_users table
    const pendingUser = await findPendingUserByEmail(email);
    if (!pendingUser) return res.status(404).json({ message: "User not found" });

    if (pendingUser.otp_code !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const expiry = new Date(pendingUser.otp_expires_at);
    if (expiry < new Date()) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    // Now, create the user in the main users table
    const user = await createUser({
      username: pendingUser.username,
      email: pendingUser.email,
      passwordHash: pendingUser.password,
      avatar: pendingUser.avatar,
      is_verified: 1
    });

    // Delete the pending record
    await deletePendingUserByEmail(email);
    
    // Send welcome email after they are verified!
    sendWelcomeEmail(user.email, user.username);

    res.json({ message: "Account verified successfully", user, token: signToken(user) });
  } catch (error) {
    next(error);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    
    const registeredUser = await findUserByEmail(email);
    if (registeredUser && registeredUser.is_verified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    // Find pending user
    const pendingUser = await findPendingUserByEmail(email);
    if (!pendingUser) return res.status(404).json({ message: "User not found" });

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await updatePendingUserOtp(email, otpCode, otpExpiresAt);
    await sendOtpEmail(email, pendingUser.username, otpCode);

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
