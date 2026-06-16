import { Router } from "express";
import { submitReport, reportSchema } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.post("/", requireAuth, validate(reportSchema), submitReport);
export default router;
