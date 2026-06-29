import { pool } from "../config/db.js";
import { ensureUserQuests, updateQuestProgress, generateNewQuestsForUser } from "../services/questService.js";

// Hardcoded Shop Items list
const SHOP_ITEMS = [
  {
    id: "premium_sub",
    type: "premium",
    value: "premium",
    title_en: "Premium Subscription (30 Days)",
    title_ar: "اشتراك بريميوم (30 يوم)",
    description_en: "Unlock premium features, exclusive analysis, and double quest rewards!",
    description_ar: "افتح المزايا المميزة، تحليلات حصرية، وضاعف جوائز المهام!",
    cost: 500
  },
  {
    id: "wood_pieces",
    type: "pieces_theme",
    value: "wood",
    title_en: "Classic Wood Pieces",
    title_ar: "قطع خشبية كلاسيكية",
    description_en: "An elegant, traditional wooden chess pieces set.",
    description_ar: "طقم قطع شطرنج خشبية تقليدية أنيقة.",
    cost: 70
  },
  {
    id: "neon_pieces",
    type: "pieces_theme",
    value: "neon",
    title_en: "Neon Cyber Pieces",
    title_ar: "قطع نيون مستقبلية",
    description_en: "Futuristic neon-glowing cybernetic pieces.",
    description_ar: "قطع شطرنج نيون متوهجة ومستقبلية.",
    cost: 130
  },
  {
    id: "gold_pieces",
    type: "pieces_theme",
    value: "gold",
    title_en: "Royal Gold Pieces",
    title_ar: "قطع ذهبية ملكية",
    description_en: "Exquisite solid gold pieces for chess kings.",
    description_ar: "قطع ذهبية فاخرة للملوك والأمراء.",
    cost: 180
  },
  {
    id: "golden_theme",
    type: "board_theme",
    value: "golden",
    title_en: "Golden Chess Board",
    title_ar: "رقعة الشطرنج الذهبية",
    description_en: "A luxurious gold-styled board theme.",
    description_ar: "مظهر رقعة ذهبي فاخر لمبارياتك.",
    cost: 50
  },
  {
    id: "neon_theme",
    type: "board_theme",
    value: "neon",
    title_en: "Cyber Neon Board",
    title_ar: "رقعة النيون المستقبلية",
    description_en: "Vibrant neon-glowing cyber board theme.",
    description_ar: "مظهر رقعة نيون متوهج وعصري.",
    cost: 100
  },
  {
    id: "vip_badge",
    type: "badge",
    value: "vip",
    title_en: "VIP Gold Badge",
    title_ar: "شارة VIP الذهبية",
    description_en: "Displays a golden VIP badge next to your username.",
    description_ar: "تعرض شارة VIP ذهبية مميزة بجوار اسم المستخدم الخاص بك.",
    cost: 150
  },
  {
    id: "avatar_king",
    type: "avatar",
    value: "avatar_king",
    title_en: "Royal King Avatar",
    title_ar: "أفاتار الملك الملكي",
    description_en: "A special crown avatar for royal players.",
    description_ar: "أفاتار تاج الملك الملكي الخاص للاعبين المميزين.",
    cost: 80
  },
  {
    id: "avatar_wizard",
    type: "avatar",
    value: "avatar_wizard",
    title_en: "Chess Wizard Avatar",
    title_ar: "أفاتار ساحر الشطرنج",
    description_en: "Show your magical tactical vision with this avatar.",
    description_ar: "أظهر رؤيتك التكتيكية الساحرة مع هذا الأفاتار.",
    cost: 120
  },
  {
    id: "level_up_boost",
    type: "boost",
    value: "level_up_boost",
    title_en: "+1.0 Level Booster",
    title_ar: "مسرع المستوى (+1.0)",
    description_en: "Instantly increase your player level by 1.0.",
    description_ar: "ارفع مستوى حسابك بمقدار 1.0 مستوى كامل على الفور.",
    cost: 200
  }
];

// Quests Controllers
export async function getQuests(req, res, next) {
  try {
    const userId = req.user.id;
    await ensureUserQuests(userId);

    const [quests] = await pool.execute(
      "SELECT id, quest_key, title_en, title_ar, target_value, current_value, is_completed FROM user_quests WHERE user_id = :userId",
      { userId }
    );

    res.json({ quests });
  } catch (error) {
    next(error);
  }
}

// Dev trigger to mock complete a quest for easier verification
export async function devCompleteQuest(req, res, next) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only / غير مسموح: للمشرفين فقط" });
    }
    const userId = req.user.id;
    const { questKey } = req.body;

    if (!questKey) {
      return res.status(400).json({ message: "Quest key is required / مفتاح المهمة مطلوب" });
    }

    const { completedSet } = await updateQuestProgress(userId, questKey, 1);

    // Fetch updated quests
    const [quests] = await pool.execute(
      "SELECT id, quest_key, title_en, title_ar, target_value, current_value, is_completed FROM user_quests WHERE user_id = :userId",
      { userId }
    );

    // Fetch updated user stats (coins & level)
    const [userRows] = await pool.execute(
      "SELECT coins, level FROM users WHERE id = :userId",
      { userId }
    );

    res.json({
      success: true,
      completedSet,
      quests,
      user: userRows[0]
    });
  } catch (error) {
    next(error);
  }
}

// Shop Controllers
export async function getShop(req, res, next) {
  try {
    const userId = req.user.id;

    // Get purchased items
    const [purchases] = await pool.execute(
      "SELECT item_type, item_value FROM user_items WHERE user_id = :userId",
      { userId }
    );

    res.json({
      shopItems: SHOP_ITEMS,
      purchasedItems: purchases
    });
  } catch (error) {
    next(error);
  }
}

export async function buyShopItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { itemId } = req.body;

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ message: "Shop item not found / عنصر المتجر غير موجود" });
    }

    // Get current user coins
    const [userRows] = await pool.execute(
      "SELECT coins, level FROM users WHERE id = :userId",
      { userId }
    );
    const user = userRows[0];

    if (user.coins < item.cost) {
      return res.status(400).json({
        message: `Insufficient coins. You need ${item.cost} coins but you only have ${user.coins} coins. / رصيد عملاتك غير كافٍ. تحتاج ${item.cost} عملة ولكن لديك ${user.coins} فقط.`
      });
    }

    // Check if user already owns it (except for level boosters which can be bought repeatedly)
    if (item.type !== "boost") {
      const [existing] = await pool.execute(
        "SELECT id FROM user_items WHERE user_id = :userId AND item_type = :type AND item_value = :value",
        { userId, type: item.type, value: item.value }
      );
      if (existing.length > 0) {
        return res.status(400).json({ message: "You already own this item / تمتلك هذا العنصر بالفعل" });
      }
    }

    // Proceed with purchase
    // 1. Deduct coins
    let newCoins = user.coins - item.cost;
    let newLevel = Number(user.level);

    if (item.type === "boost" && item.value === "level_up_boost") {
      newLevel += 1.0;
      await pool.execute(
        "UPDATE users SET coins = :newCoins, level = :newLevel WHERE id = :userId",
        { newCoins, newLevel, userId }
      );
    } else if (item.type === "premium") {
      await pool.execute(
        "UPDATE users SET coins = :newCoins, is_premium = 1 WHERE id = :userId",
        { newCoins, userId }
      );
      try {
        const { sendPremiumActivationEmail } = await import("../services/emailService.js");
        await sendPremiumActivationEmail(req.user.email, req.user.username);
      } catch (emailErr) {
        console.error("Failed to send activation email:", emailErr);
      }
      await pool.execute(
        "INSERT INTO user_items (user_id, item_type, item_value) VALUES (:userId, :type, :value)",
        { userId, type: item.type, value: item.value }
      );
    } else {
      if (item.type === "avatar") {
        await pool.execute(
          "UPDATE users SET coins = :newCoins, avatar = :value WHERE id = :userId",
          { newCoins, value: item.value, userId }
        );
      } else {
        await pool.execute(
          "UPDATE users SET coins = :newCoins WHERE id = :userId",
          { newCoins, userId }
        );
      }
      await pool.execute(
        "INSERT INTO user_items (user_id, item_type, item_value) VALUES (:userId, :type, :value)",
        { userId, type: item.type, value: item.value }
      );
    }

    res.json({
      success: true,
      message: `Successfully purchased ${item.title_en}! / تم شراء ${item.title_ar} بنجاح!`,
      coins: newCoins,
      level: newLevel
    });
  } catch (error) {
    next(error);
  }
}
