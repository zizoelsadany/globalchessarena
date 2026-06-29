import { pool } from "../config/db.js";

export async function generateNewQuestsForUser(userId) {
  const questsPool = [
    { key: "play_match", title_en: "Play a Chess Match", title_ar: "العب مباراة شطرنج", target: 1 },
    { key: "win_match", title_en: "Win a Chess Match", title_ar: "فز بمباراة شطرنج", target: 1 },
    { key: "solve_puzzle", title_en: "Solve a Tactical Puzzle", title_ar: "حل لغز تكتيكي", target: 1 },
    { key: "chat_ai", title_en: "Consult the AI Coach", title_ar: "استشر المدرب الذكي", target: 1 },
    { key: "win_white", title_en: "Win a Match as White", title_ar: "فز بمباراة باللون الأبيض", target: 1 },
    { key: "win_black", title_en: "Win a Match as Black", title_ar: "فز بمباراة باللون الأسود", target: 1 }
  ];

  // Randomly pick 4 unique quests from the pool
  const shuffled = questsPool.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 4);

  // Insert them
  for (const q of selected) {
    await pool.execute(
      `INSERT INTO user_quests (user_id, quest_key, title_en, title_ar, target_value) 
       VALUES (:userId, :questKey, :titleEn, :titleAr, :targetValue)`,
      {
        userId,
        questKey: q.key,
        titleEn: q.title_en,
        titleAr: q.title_ar,
        targetValue: q.target
      }
    );
  }
}

export async function ensureUserQuests(userId) {
  const [quests] = await pool.execute(
    "SELECT id FROM user_quests WHERE user_id = :userId",
    { userId }
  );

  if (quests.length === 0) {
    await generateNewQuestsForUser(userId);
  }
}

export async function updateQuestProgress(userId, questKey, amount = 1) {
  try {
    // Ensure user has active quests
    await ensureUserQuests(userId);

    // Check if user has this quest active and incomplete
    const [quests] = await pool.execute(
      "SELECT id, current_value, target_value FROM user_quests WHERE user_id = :userId AND quest_key = :questKey AND is_completed = 0",
      { userId, questKey }
    );

    if (quests.length === 0) return { completedSet: false };

    let completedSet = false;

    for (const q of quests) {
      const newProgress = q.current_value + amount;
      const isCompleted = newProgress >= q.target_value ? 1 : 0;
      
      await pool.execute(
        "UPDATE user_quests SET current_value = :newProgress, is_completed = :isCompleted WHERE id = :id",
        { newProgress, isCompleted, id: q.id }
      );
    }

    // Check if ALL 4 quests of the user are now completed
    const [allQuests] = await pool.execute(
      "SELECT id, is_completed FROM user_quests WHERE user_id = :userId",
      { userId }
    );

    if (allQuests.length === 4 && allQuests.every(q => q.is_completed === 1)) {
      // 1. Delete completed quests
      await pool.execute("DELETE FROM user_quests WHERE user_id = :userId", { userId });

      // 2. Grant rewards: +20 coins and +0.5 level
      await pool.execute(
        "UPDATE users SET coins = coins + 20, level = level + 0.5 WHERE id = :userId",
        { userId }
      );

      // 3. Generate 4 new quests
      await generateNewQuestsForUser(userId);
      completedSet = true;
    }

    return { completedSet };
  } catch (error) {
    console.error("Error updating quest progress:", error);
    return { completedSet: false };
  }
}
