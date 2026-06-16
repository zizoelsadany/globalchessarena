import { Router } from "express";
import { getProfile, leaderboard, profileSchema, updateProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/leaderboard", leaderboard);
router.get("/:id", getProfile);
router.patch("/me/profile", requireAuth, validate(profileSchema), updateProfile);

export default router;
