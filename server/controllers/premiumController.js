import { pool } from "../config/db.js";
import { findUserById, findUserByInviteCode } from "../models/User.js";
import { listMatchesForUser } from "../models/Match.js";
import { createNotification } from "../models/Notification.js";

// --- Friends System ---
export async function getFriends(req, res, next) {
  try {
    const userId = req.user.id;
    // Get all friends (both where user_id is the user or friend_id is the user)
    const [rows] = await pool.execute(
      `SELECT f.id AS friendship_id, f.status, f.created_at,
              u.id AS friend_id, u.username, u.avatar, u.elo_rating, u.invite_code,
              f.user_id AS requester_id
       FROM friends f
       JOIN users u ON u.id = IF(f.user_id = :userId, f.friend_id, f.user_id)
       WHERE f.user_id = :userId OR f.friend_id = :userId`,
      { userId }
    );
    res.json({ friends: rows });
  } catch (error) {
    next(error);
  }
}

export async function addFriend(req, res, next) {
  try {
    const userId = req.user.id;
    const { inviteCode } = req.body;

    if (!inviteCode) return res.status(400).json({ message: "Invite code is required / رمز الدعوة مطلوب" });

    const friend = await findUserByInviteCode(inviteCode);
    if (!friend) return res.status(404).json({ message: "Player not found / اللاعب غير موجود" });

    if (friend.id === userId) {
      return res.status(400).json({ message: "You cannot add yourself / لا يمكنك إضافة نفسك" });
    }

    // Check if friendship already exists
    const [existing] = await pool.execute(
      `SELECT id, status FROM friends 
       WHERE (user_id = :userId AND friend_id = :friendId)
          OR (user_id = :friendId AND friend_id = :userId)`,
      { userId, friendId: friend.id }
    );

    if (existing.length > 0) {
      const status = existing[0].status;
      return res.status(400).json({
        message: status === "accepted"
          ? "You are already friends / أنتم أصدقاء بالفعل"
          : "Friend request already pending / طلب الصداقة معلق بالفعل"
      });
    }

    // Insert friendship request
    await pool.execute(
      "INSERT INTO friends (user_id, friend_id, status) VALUES (:userId, :friendId, 'pending')",
      { userId, friendId: friend.id }
    );

    res.json({ success: true, message: "Friend request sent / تم إرسال طلب الصداقة" });
  } catch (error) {
    next(error);
  }
}

export async function respondFriendRequest(req, res, next) {
  try {
    const userId = req.user.id;
    const { friendshipId, action } = req.body; // action: 'accept' or 'reject'

    if (!friendshipId || !action) {
      return res.status(400).json({ message: "friendshipId and action are required" });
    }

    // Verify request target is the current user
    const [rows] = await pool.execute(
      "SELECT user_id, friend_id FROM friends WHERE id = :friendshipId",
      { friendshipId }
    );

    if (rows.length === 0) return res.status(404).json({ message: "Request not found" });

    const friendship = rows[0];
    if (friendship.friend_id !== userId) {
      return res.status(403).json({ message: "You can only respond to requests sent to you" });
    }

    if (action === "accept") {
      await pool.execute(
        "UPDATE friends SET status = 'accepted' WHERE id = :friendshipId",
        { friendshipId }
      );
      res.json({ success: true, message: "Friend request accepted / تم قبول الصداقة" });
    } else {
      await pool.execute(
        "DELETE FROM friends WHERE id = :friendshipId",
        { friendshipId }
      );
      res.json({ success: true, message: "Friend request declined / تم رفض الصداقة" });
    }
  } catch (error) {
    next(error);
  }
}

export async function removeFriend(req, res, next) {
  try {
    const userId = req.user.id;
    const { friendshipId } = req.body;

    if (!friendshipId) return res.status(400).json({ message: "friendshipId is required" });

    // Verify user is part of the friendship
    const [rows] = await pool.execute(
      "SELECT user_id, friend_id FROM friends WHERE id = :friendshipId",
      { friendshipId }
    );

    if (rows.length === 0) return res.status(404).json({ message: "Friendship not found" });

    const friendship = rows[0];
    if (friendship.user_id !== userId && friendship.friend_id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await pool.execute("DELETE FROM friends WHERE id = :friendshipId", { friendshipId });
    res.json({ success: true, message: "Friend removed / تم إزالة الصديق" });
  } catch (error) {
    next(error);
  }
}

// --- AI Coach ---
export async function chatWithAICoach(req, res, next) {
  try {
    const isPremium = req.user.role === "admin" || req.user.is_premium === 1;
    if (!isPremium) {
      return res.status(403).json({
        message: "AI Coach is a premium feature. Please upgrade to unlock! / خدمة المدرب الذكي متاحة للمشتركين فقط. قم بالترقية للوصول إليها!",
        premiumRequired: true
      });
    }

    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    // Fetch user matches to give context-aware responses
    const matches = await listMatchesForUser(req.user.id);
    const lastMatch = matches[0] || null;

    // Smart simulated Grandmaster replies
    const msg = message.toLowerCase();
    let reply = "";
    let replyAr = "";

    if (msg.includes("hello") || msg.includes("hi") || msg.includes("مرحبا") || msg.includes("سلام")) {
      reply = `Hello Grandmaster! I am your AI Coach. I see your current rating is ${req.user.elo_rating} Elo. Ready to review your moves?`;
      replyAr = `مرحباً بك يا بطل! أنا مدربك الذكي. أرى أن تصنيفك الحالي هو ${req.user.elo_rating} إيلو. هل أنت مستعد لمراجعة حركاتك المتاحة؟`;
    } else if (msg.includes("opening") || msg.includes("defense") || msg.includes("افتتاح") || msg.includes("دفاع")) {
      reply = "For your level, I highly recommend mastering 1.e4 openings (like the Ruy Lopez or Italian Game) as White, and the Sicilian Defense or French Defense as Black. They build strong tactical fundamentals.";
      replyAr = "لمستواك الحالي، أنصحك بشدة بإتقان افتتاحيات 1.e4 (مثل Ruy Lopez أو اللعب الإيطالي) بالقطع البيضاء، ودفاع صقلية أو الدفاع الفرنسي بالقطع السوداء. إنها تبني أُسساً تكتيكية قوية.";
    } else if (msg.includes("improve") || msg.includes("better") || msg.includes("اتطور") || msg.includes("أتحسن")) {
      reply = `At ${req.user.elo_rating} Elo, games are mostly decided by tactical blunders. Focus 80% of your training on solving puzzles and checking your opponent's threats before making any move.`;
      replyAr = `عند مستوى ${req.user.elo_rating} إيلو، تُحسم معظم المباريات بالأخطاء التكتيكية البسيطة. ركز 80% من تدريبك على حل الألغاز والتحقق من تهديدات الخصم قبل القيام بأي حركة.`;
    } else if (msg.includes("last") || msg.includes("match") || msg.includes("مباراة") || msg.includes("أخر")) {
      if (lastMatch) {
        const side = lastMatch.white_player === req.user.id ? "White" : "Black";
        const sideAr = lastMatch.white_player === req.user.id ? "الأبيض" : "الأسود";
        const resultText = lastMatch.winner === req.user.id ? "won! Excellent job" : "lost. A great opportunity to learn";
        const resultTextAr = lastMatch.winner === req.user.id ? "فزت بها! عمل ممتاز" : "خسرتها. فرصة رائعة للتعلم وتجنب الأخطاء";
        reply = `I looked at your last game where you played as ${side} and ${resultText}. Try reviewing the match history using our analysis board to check for positional improvements.`;
        replyAr = `لقد اطلعت على مباراتك الأخيرة حيث لعبت باللون ${sideAr} و ${resultTextAr}. حاول مراجعة تاريخ المباراة عبر رقعة التحليل لدينا لمعرفة مواضع التحسين الممكنة.`;
      } else {
        reply = "You haven't played any rated matches yet! Go play a game against a player or the AI and then ask me to review it.";
        replyAr = "لم تلعب أي مباريات مصنفة حتى الآن! اذهب والعب مباراة ضد لاعب آخر أو الكمبيوتر ثم اطلب مني مراجعتها.";
      }
    } else {
      reply = "That's an interesting chess concept. Always remember: control the center, develop your minor pieces (knights and bishops) early, and castle your king to safety as soon as possible!";
      replyAr = "هذا مفهوم شيق في الشطرنج. تذكر دائماً: سيطر على الوسط، طور قطعك الصغيرة (الخيول والفيلة) مبكراً، وقم بتأمين ملكك عن طريق التبييت في أسرع وقت ممكن!";
    }

    const containsArabic = /[\u0600-\u06FF]/.test(message);
    const useArabic = containsArabic || (req.body.lang === "ar" && !/[a-zA-Z]/.test(message));

    res.json({
      reply: useArabic ? replyAr : reply
    });
  } catch (error) {
    next(error);
  }
}

// --- Puzzles System ---
const MOCK_PUZZLES = [
  { id: 1, fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", solution: "f7f5", description: "Black to move: Counter-attack in the center!", rating: 800 },
  { id: 2, fen: "r1bqk1r1/ppppbp1p/2n2np1/4p3/2B1P3/2N2N2/PPPPQPPP/R1B1K2R w KQq - 6 6", solution: "c3d5", description: "White to move: Place the knight in the central outpost.", rating: 1000 },
  { id: 3, fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2", solution: "g1f3", description: "White to move: Classic development in response to Sicilian Defense.", rating: 900 },
  { id: 4, fen: "r1bqk1nr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", solution: "g8f6", description: "Black to move: Develop the knight and threaten White's pawn.", rating: 950 },
  { id: 5, fen: "rnbqkb1r/ppp2ppp/5n2/3pp3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq d6 0 4", solution: "c3d5", description: "White to move: Reclaim the center pawn.", rating: 1100 }
];

export async function getPuzzles(req, res, next) {
  try {
    const userId = req.user.id;
    const isPremium = req.user.role === "admin" || req.user.is_premium === 1;
    let limitExceeded = false;

    if (!isPremium) {
      const [attempts] = await pool.execute(
        "SELECT COUNT(DISTINCT puzzle_id) AS count FROM user_puzzle_attempts WHERE user_id = :userId AND solved_at = CURDATE()",
        { userId }
      );
      if (attempts[0].count >= 3) {
        limitExceeded = true;
      }
    }

    res.json({ puzzles: MOCK_PUZZLES, limitExceeded });
  } catch (error) {
    next(error);
  }
}

export async function solvePuzzle(req, res, next) {
  try {
    const userId = req.user.id;
    const { puzzleId } = req.body;

    const isPremium = req.user.role === "admin" || req.user.is_premium === 1;
    if (!isPremium) {
      // Check puzzle solve limit for today
      const [attempts] = await pool.execute(
        "SELECT COUNT(DISTINCT puzzle_id) AS count FROM user_puzzle_attempts WHERE user_id = :userId AND solved_at = CURDATE()",
        { userId }
      );

      if (attempts[0].count >= 3) {
        return res.status(403).json({
          message: "Free users are limited to 3 puzzles per day. Upgrade to Premium for unlimited tactical puzzles! / الحساب المجاني محدد بـ 3 ألغاز يومياً. قم بالترقية للحساب البريميوم لحل ألغاز غير محدودة!",
          limitExceeded: true
        });
      }
    }

    // Log the puzzle solve
    await pool.execute(
      "INSERT INTO user_puzzle_attempts (user_id, puzzle_id, solved_at) VALUES (:userId, :puzzleId, CURDATE())",
      { userId, puzzleId }
    );

    res.json({ success: true, message: "Puzzle solved successfully / تم حل اللغز بنجاح!" });
  } catch (error) {
    next(error);
  }
}

// --- Checkout & Payments ---
export async function createCheckout(req, res, next) {
  try {
    const userId = req.user.id;

    const sessionId = `sim_session_${Math.random().toString(36).substring(2, 12)}${Date.now()}`;

    // Log the pending payment
    await pool.execute(
      "INSERT INTO payments (user_id, amount, currency, status, stripe_session_id) VALUES (:userId, 9.99, 'USD', 'pending', :sessionId)",
      { userId, sessionId }
    );

    res.json({ sessionId, checkoutUrl: `/checkout-mock?session_id=${sessionId}` });
  } catch (error) {
    next(error);
  }
}

export async function verifyCheckout(req, res, next) {
  try {
    const userId = req.user.id;
    const { sessionId, status } = req.body; // status: 'success' or 'cancel'

    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

    const [payments] = await pool.execute(
      "SELECT id, status FROM payments WHERE stripe_session_id = :sessionId AND user_id = :userId",
      { sessionId, userId }
    );

    if (payments.length === 0) return res.status(404).json({ message: "Transaction not found" });

    if (status === "success") {
      // Update payment status to review
      await pool.execute(
        "UPDATE payments SET status = 'review' WHERE stripe_session_id = :sessionId",
        { sessionId }
      );

      // Create Admin Notification
      const adminMsg = `المستخدم ${req.user.username} دفع 9.99$ لتفعيل صلاحية البريميوم (Session: ${sessionId}). يرجى المراجعة والتفعيل.`;
      await createNotification(adminMsg);

      // Send Email to Admin
      try {
        const { sendAdminPremiumRequestEmail } = await import("../services/emailService.js");
        await sendAdminPremiumRequestEmail(req.user.username, sessionId);
      } catch (emailErr) {
        console.error("Failed to send admin premium request email:", emailErr);
      }

      res.json({
        success: true,
        pendingApproval: true,
        message: "Your request is under review. Activation will take place within 2 hours. / طلبك قيد المراجعة، وسيتم التفعيل خلال ساعتين."
      });
    } else {
      await pool.execute(
        "UPDATE payments SET status = 'failed' WHERE stripe_session_id = :sessionId",
        { sessionId }
      );
      res.json({ success: false, message: "Payment was not completed." });
    }
  } catch (error) {
    next(error);
  }
}
