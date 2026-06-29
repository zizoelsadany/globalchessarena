import { findUserById } from "../models/User.js";
import { findPendingUserById } from "../models/PendingUser.js";
import { verifyToken } from "../utils/tokens.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing authentication token" });

    const payload = verifyToken(token);
    let user = null;

    if (typeof payload.sub === "string" && payload.sub.startsWith("pending:")) {
      const pendingId = parseInt(payload.sub.split(":")[1], 10);
      const pendingUser = await findPendingUserById(pendingId);
      if (pendingUser) {
        user = {
          id: `pending:${pendingUser.id}`,
          username: pendingUser.username,
          email: pendingUser.email,
          avatar: pendingUser.avatar,
          role: "player",
          status: "active",
          is_verified: 0,
          is_premium: 0,
          level: 1,
          xp: 0,
          coins: 0,
          is_pending: true
        };
      }
    } else {
      user = await findUserById(payload.sub);
    }

    if (!user) return res.status(401).json({ message: "Invalid authentication token" });
    if (user.status !== "active") return res.status(403).json({ message: "User account is banned" });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired authentication token" });
  }
}

