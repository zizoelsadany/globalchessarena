import { Router } from "express";
import { getTournaments, joinTournament } from "../controllers/tournamentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", getTournaments);
router.post("/:id/join", joinTournament);

export default router;
