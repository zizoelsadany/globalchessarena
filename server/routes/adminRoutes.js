import { Router } from "express";
import {
  getAdminDashboard,
  getAllUsers,
  deleteUser,
  banUser,
  unbanUser,
  toggleUserPremium,
  getReports,
  resolveReport,
  createAdminNotification,
  createAdminTournament,
  updateAdminTournament,
  deleteAdminTournament,
  createAdminTournamentMatch,
  resetSiteVisits,
  getAnalyses,
  deleteAnalysis,
  deleteAllAnalyses,
  getPendingPayments,
  approvePayment,
  declinePayment,
  distributeCoins,
  deleteMatchAdmin,
  deductCoins
} from "../controllers/adminController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";import { tournamentUpload } from "../middleware/upload.js";
const router = Router();

const notificationSchema = z.object({
  message: z.string().trim().min(3).max(1000),
  targetUserId: z.union([z.number().int(), z.string(), z.null()]).optional(),
  sendEmail: z.union([z.boolean(), z.string(), z.number()]).optional()
});
const tournamentSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]).optional(),
  max_participants: z.union([z.number().int().min(2).max(1024), z.string().transform(Number)]).optional(),
  logo_url: z.string().trim().max(500).optional().nullable(),
  style_color: z.string().trim().max(50).optional(),
  ends_at: z.string().trim().optional().nullable()
});

const matchSchema = z.object({
  whitePlayerId: z.union([z.number().int(), z.string().transform(Number)]),
  blackPlayerId: z.union([z.number().int(), z.string().transform(Number)]),
  scheduledTime: z.string().trim().optional().nullable()
});

const reportStatusSchema = z.object({ status: z.enum(["open", "reviewed", "resolved"]) });

router.use(requireAuth, requireAdmin);

router.get("/dashboard", getAdminDashboard);
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/ban", banUser);
router.post("/users/:id/unban", unbanUser);
router.post("/users/:id/toggle-premium", toggleUserPremium);
router.post("/users/:id/distribute-coins", distributeCoins);
router.post("/users/:id/deduct-coins", deductCoins);
router.get("/reports", getReports);
router.patch("/reports/:id", validate(reportStatusSchema), resolveReport);
router.post("/notifications", validate(notificationSchema), createAdminNotification);
router.post("/tournaments", tournamentUpload.single("logo"), (req, res, next) => {
  if (req.file) {
    req.body.logo_url = `/uploads/${req.file.filename}`;
  }
  next();
}, validate(tournamentSchema), createAdminTournament);
router.patch("/tournaments/:id", tournamentUpload.single("logo"), (req, res, next) => {
  if (req.file) {
    req.body.logo_url = `/uploads/${req.file.filename}`;
  }
  next();
}, validate(tournamentSchema), updateAdminTournament);
router.delete("/tournaments/:id", deleteAdminTournament);
router.post("/tournaments/:id/matches", validate(matchSchema), createAdminTournamentMatch);
router.post("/dashboard/reset-visits", resetSiteVisits);
router.get("/analyses", getAnalyses);
router.delete("/analyses/:id", deleteAnalysis);
router.delete("/analyses", deleteAllAnalyses);

router.get("/payments", getPendingPayments);
router.post("/payments/:id/approve", approvePayment);
router.post("/payments/:id/decline", declinePayment);
router.delete("/matches/:id", deleteMatchAdmin);

export default router;
