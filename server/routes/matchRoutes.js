import { Router } from "express";
import { matchDetails, myMatches } from "../controllers/matchController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/mine", requireAuth, myMatches);
router.get("/:id", requireAuth, matchDetails);

export default router;
