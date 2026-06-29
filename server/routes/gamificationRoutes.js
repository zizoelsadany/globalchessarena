import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getQuests,
  devCompleteQuest,
  getShop,
  buyShopItem
} from "../controllers/gamificationController.js";

const router = Router();

router.get("/quests", requireAuth, getQuests);
router.post("/quests/dev-complete", requireAuth, devCompleteQuest);

router.get("/shop", requireAuth, getShop);
router.post("/shop/buy", requireAuth, buyShopItem);

export default router;
