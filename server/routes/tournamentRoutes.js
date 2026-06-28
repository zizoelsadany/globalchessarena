import { Router } from "express";
import { getTournaments, joinTournament, getTournamentDetails, getTournamentMatches, getTournamentParticipants } from "../controllers/tournamentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", getTournaments);
router.get("/:id", getTournamentDetails);
router.post("/:id/join", joinTournament);
router.get("/:id/matches", getTournamentMatches);
router.get("/:id/participants", getTournamentParticipants);

export default router;
