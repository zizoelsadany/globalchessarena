import { Router } from "express";
import { matchDetails, myMatches, matchAnalysis, removeMatch, createComputerMatch } from "../controllers/matchController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/mine", requireAuth, myMatches);
router.post("/computer", requireAuth, createComputerMatch);
router.get("/:id/analysis", requireAuth, matchAnalysis);
router.get("/:id", requireAuth, matchDetails);
router.delete("/:id", requireAuth, removeMatch);

export default router;
