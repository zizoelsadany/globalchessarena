import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { getSocketServer } from "../sockets/socketServer.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";

const router = Router();

const notificationSchema = z.object({
  message: z.string().trim().min(3).max(1000),
  targetUserId: z.number().optional()
});

router.use(requireAuth, requireAdmin);

router.post("/broadcast", validate(notificationSchema), async (req, res, next) => {
  try {
    const io = getSocketServer();
    const payload = {
      id: Date.now().toString(),
      message: req.body.message,
      targetUserId: req.body.targetUserId || null,
      createdAt: new Date().toISOString()
    };
    if (payload.targetUserId) {
      io.to(`user:${payload.targetUserId}`).emit("adminNotification", payload);
    } else {
      io.emit("adminNotification", payload);
    }
    res.status(201).json({ notification: payload });
  } catch (error) {
    next(error);
  }
});

export default router;
