import { Router } from "express";
import {
  getAdminDashboard,
  getAllUsers,
  deleteUser,
  banUser,
  unbanUser,
  getReports,
  resolveReport,
  createAdminNotification,
  createAdminTournament,
  updateAdminTournament,
  deleteAdminTournament
} from "../controllers/adminController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";

const router = Router();

const notificationSchema = z.object({ message: z.string().trim().min(3).max(1000) });
const tournamentSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]).optional()
});
const reportStatusSchema = z.object({ status: z.enum(["open", "reviewed", "resolved"]) });

router.use(requireAuth, requireAdmin);

router.get("/dashboard", getAdminDashboard);
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/ban", banUser);
router.post("/users/:id/unban", unbanUser);
router.get("/reports", getReports);
router.patch("/reports/:id", validate(reportStatusSchema), resolveReport);
router.post("/notifications", validate(notificationSchema), createAdminNotification);
router.post("/tournaments", validate(tournamentSchema), createAdminTournament);
router.patch("/tournaments/:id", validate(tournamentSchema), updateAdminTournament);
router.delete("/tournaments/:id", deleteAdminTournament);

export default router;
