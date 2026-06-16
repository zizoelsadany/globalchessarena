import { findUserById } from "../models/User.js";
import { verifyToken } from "../utils/tokens.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing authentication token" });

    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid authentication token" });
    if (user.status !== "active") return res.status(403).json({ message: "User account is banned" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired authentication token" });
  }
}
