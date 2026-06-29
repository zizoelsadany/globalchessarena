import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getFriends,
  addFriend,
  respondFriendRequest,
  removeFriend,
  chatWithAICoach,
  getPuzzles,
  solvePuzzle,
  createCheckout,
  verifyCheckout,
  createManualPayment
} from "../controllers/premiumController.js";
import { receiptUpload } from "../middleware/upload.js";

const router = Router();

// Friends System
router.get("/friends", requireAuth, getFriends);
router.post("/friends/add", requireAuth, addFriend);
router.post("/friends/respond", requireAuth, respondFriendRequest);
router.post("/friends/remove", requireAuth, removeFriend);

// AI Coach
router.post("/ai-coach", requireAuth, chatWithAICoach);

// Puzzles
router.get("/puzzles", requireAuth, getPuzzles);
router.post("/puzzles/solve", requireAuth, solvePuzzle);

// Payments
router.post("/checkout", requireAuth, createCheckout);
router.post("/checkout/verify", requireAuth, verifyCheckout);
router.post("/checkout/manual", requireAuth, receiptUpload.single("receipt"), createManualPayment);

export default router;
