import { pool } from "../config/db.js";
import { listAllUsers, deleteUserById, banUserById, unbanUserById, findUserById } from "../models/User.js";
import { listAllMatches, countMatches, getMatchById, deleteMatch } from "../models/Match.js";
import { listReports, updateReportStatus, countOpenReports } from "../models/Report.js";
import { listNotifications, createNotification } from "../models/Notification.js";
import { listTournaments, createTournament, updateTournament, deleteTournament, createTournamentMatch, getTournamentById } from "../models/Tournament.js";
import { getSocketServer } from "../sockets/socketServer.js";
import { getVisits, resetVisits } from "../models/Analytics.js";
import { sendTournamentEmail, sendMatchNotificationEmail, sendAdminDirectEmail } from "../services/emailService.js";

export async function getAdminDashboard(req, res, next) {
  try {
    const users = await listAllUsers({ limit: 50 });
    const matches = await listAllMatches({ limit: 50 });
    const reports = await listReports({ status: "open", limit: 20 });
    const notifications = await listNotifications({ limit: 10 });
    const tournaments = await listTournaments({ limit: 20 });
    const openReportCount = await countOpenReports();
    const totalMatches = await countMatches();
    const siteVisits = await getVisits();

    res.json({ users, reports, notifications, tournaments, openReportCount, matches, totalMatches, siteVisits });
  } catch (error) {
    next(error);
  }
}

export async function resetSiteVisits(req, res, next) {
  try {
    await resetVisits();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getAllUsers(req, res, next) {
  try {
    const users = await listAllUsers({ limit: 200 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await deleteUserById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function banUser(req, res, next) {
  try {
    await banUserById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function unbanUser(req, res, next) {
  try {
    await unbanUserById(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserPremium(req, res, next) {
  try {
    const userId = req.params.id;
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newPremiumStatus = user.is_premium === 1 ? 0 : 1;

    // Update user premium status
    await pool.execute(
      "UPDATE users SET is_premium = :status WHERE id = :userId",
      { status: newPremiumStatus, userId }
    );

    // If upgraded, queue activation email
    if (newPremiumStatus === 1) {
      try {
        const { sendPremiumActivationEmail } = await import("../services/emailService.js");
        await sendPremiumActivationEmail(user.email, user.username);
      } catch (emailErr) {
        console.error("Failed to send activation email:", emailErr);
      }
    }

    res.json({ success: true, is_premium: newPremiumStatus });
  } catch (error) {
    next(error);
  }
}

export async function getReports(req, res, next) {
  try {
    const reports = await listReports({ limit: 200 });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
}

export async function resolveReport(req, res, next) {
  try {
    const report = await updateReportStatus(req.params.id, req.body.status || "resolved");
    res.json({ report });
  } catch (error) {
    next(error);
  }
}

export async function createAdminNotification(req, res, next) {
  try {
    const { message, targetUserId } = req.body;
    const sendEmail = req.body.sendEmail === true || req.body.sendEmail === "true" || req.body.sendEmail === 1 || req.body.sendEmail === "1";
    
    console.log("[Admin Notification] Processing message:", { message, targetUserId, sendEmail });

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const io = getSocketServer();

    // If targetUserId is provided, send direct notification to specific user
    if (targetUserId) {
      const user = await findUserById(targetUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const payload = {
        id: `direct-notify-${Date.now()}`,
        message: message,
        createdAt: new Date().toISOString()
      };
      
      // Emit socket notification to the user's personal room
      io.to(`user:${targetUserId}`).emit("adminNotification", payload);

      // Send direct email if requested
      if (sendEmail && user.email) {
        try {
          console.log(`[Admin Notification] Sending email to targeted user: ${user.username} (${user.email})`);
          await sendAdminDirectEmail(user.email, user.username, message);
          console.log(`[Admin Notification] Email sent successfully to: ${user.email}`);
        } catch (mailErr) {
          console.error(`[Admin Notification] Error sending email to: ${user.email}`, mailErr);
        }
      }

      return res.status(201).json({ success: true, message: "Direct notification sent successfully" });
    }

    // Otherwise, broadcast global notification to all users
    const notification = await createNotification(message);
    const payload = {
      id: notification.id.toString(),
      message: notification.message,
      createdAt: notification.created_at
    };
    
    io.emit("adminNotification", payload);

    // If sendEmail is requested for a global broadcast, mail all active users
    if (sendEmail) {
      console.log(`[Admin Notification] Broadcasting emails to all active users...`);
      listAllUsers({ limit: 500 }).then(users => {
        users.forEach(user => {
          if (user.email && user.status === 'active') {
            console.log(`[Admin Notification] Sending broadcast email to: ${user.username} (${user.email})`);
            sendAdminDirectEmail(user.email, user.username, message).catch(err => {
              console.error(`[Admin Notification] Error sending broadcast email to: ${user.email}`, err);
            });
          }
        });
      }).catch(console.error);
    }

    res.status(201).json({ notification });
  } catch (error) {
    next(error);
  }
}

export async function createAdminTournament(req, res, next) {
  try {
    const tournament = await createTournament(req.body);
    
    // Notify all users via email (do not block request, run asynchronously)
    listAllUsers({ limit: 500 }).then(users => {
      users.forEach(user => {
        if (user.email && user.status === 'active') {
          sendTournamentEmail(user.email, user.username, tournament.name);
        }
      });
    }).catch(console.error);

    res.status(201).json({ tournament });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminTournament(req, res, next) {
  try {
    const tournament = await updateTournament(req.params.id, req.body);
    res.json({ tournament });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminTournament(req, res, next) {
  try {
    await deleteTournament(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function createAdminTournamentMatch(req, res, next) {
  try {
    const { id: tournamentId } = req.params;
    const { whitePlayerId, blackPlayerId, scheduledTime } = req.body;

    const matchId = await createTournamentMatch({
      tournamentId,
      whitePlayerId,
      blackPlayerId,
      scheduledTime
    });

    // Notify players via socket and email
    try {
      const whiteUser = await findUserById(whitePlayerId);
      const blackUser = await findUserById(blackPlayerId);
      const tournament = await getTournamentById(tournamentId);
      const io = getSocketServer();

      if (whiteUser && blackUser && tournament) {
        const timeStr = scheduledTime ? ` at ${new Date(scheduledTime).toLocaleString()}` : '';
        const messageWhite = `A new tournament match is scheduled for you: vs ${blackUser.username}${timeStr}`;
        const messageBlack = `A new tournament match is scheduled for you: vs ${whiteUser.username}${timeStr}`;

        // Send Socket notifications
        const whitePayload = {
          id: `match-scheduled-white-${matchId}-${Date.now()}`,
          message: messageWhite,
          matchId,
          createdAt: new Date().toISOString()
        };
        const blackPayload = {
          id: `match-scheduled-black-${matchId}-${Date.now()}`,
          message: messageBlack,
          matchId,
          createdAt: new Date().toISOString()
        };
        
        io.to(`user:${whitePlayerId}`).emit("adminNotification", whitePayload);
        io.to(`user:${blackPlayerId}`).emit("adminNotification", blackPayload);

        // Send Email notifications
        if (whiteUser.email && whiteUser.status === 'active') {
          sendMatchNotificationEmail(whiteUser.email, whiteUser.username, blackUser.username, tournament.name).catch(console.error);
        }
        if (blackUser.email && blackUser.status === 'active') {
          sendMatchNotificationEmail(blackUser.email, blackUser.username, whiteUser.username, tournament.name).catch(console.error);
        }
      }
    } catch (err) {
      console.error("Failed to send tournament pairing notifications:", err);
    }

    // schedule notification for this match if a scheduledTime was provided
    if (scheduledTime) {
      try {
        const io = getSocketServer();
        const scheduler = await import("../sockets/matchScheduler.js");
        const match = await getMatchById(matchId);
        if (match) {
          scheduler.scheduleMatchNotification(io, match);
        }
      } catch (e) {
        console.error("Failed to schedule match notification:", e);
      }
    }

    res.status(201).json({ success: true, matchId });
  } catch (error) {
    next(error);
  }
}

export async function getAnalyses(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT ua.id, ua.user_id, ua.match_id, ua.requested_at,
             u.username, u.email,
             m.result, m.end_time
      FROM user_analysis_requests ua
      LEFT JOIN users u ON ua.user_id = u.id
      LEFT JOIN matches m ON ua.match_id = m.id
      WHERE ua.is_deleted = 0
      ORDER BY ua.id DESC
      LIMIT 200
    `);
    res.json({ analyses: rows });
  } catch (error) {
    next(error);
  }
}

export async function deleteAnalysis(req, res, next) {
  try {
    const analysisId = req.params.id;
    await pool.execute(
      "UPDATE user_analysis_requests SET is_deleted = 1 WHERE id = :id",
      { id: analysisId }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function deleteAllAnalyses(req, res, next) {
  try {
    await pool.execute("UPDATE user_analysis_requests SET is_deleted = 1");
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getPendingPayments(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*, u.username, u.email 
      FROM payments p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);
    res.json({ payments: rows });
  } catch (error) {
    next(error);
  }
}

export async function approvePayment(req, res, next) {
  try {
    const paymentId = req.params.id;

    // Get payment details
    const [payments] = await pool.execute(
      "SELECT user_id, amount, coins_amount FROM payments WHERE id = :id",
      { id: paymentId }
    );

    if (payments.length === 0) return res.status(404).json({ message: "Payment not found" });
    const payment = payments[0];

    // Update payment status to completed
    await pool.execute(
      "UPDATE payments SET status = 'completed' WHERE id = :id",
      { id: paymentId }
    );

    const coinsNum = Number(payment.coins_amount) || 0;

    if (coinsNum > 0) {
      // Award Coins
      await pool.execute(
        "UPDATE users SET coins = coins + :coinsAmount WHERE id = :userId",
        { coinsAmount: coinsNum, userId: payment.user_id }
      );

      // Notify player via socket
      const io = getSocketServer();
      if (io) {
        io.to(`user:${payment.user_id}`).emit("adminNotification", {
          id: `coins-approved-${Date.now()}`,
          message: `تمت الموافقة على دفعتك وإضافة ${coinsNum} عملة إلى حسابك! / Your payment has been approved and ${coinsNum} coins added to your account!`,
          createdAt: new Date().toISOString()
        });
      }
      res.json({ success: true, message: `Payment approved. Credited ${coinsNum} coins to player.` });
    } else {
      // Update user to premium
      await pool.execute(
        "UPDATE users SET is_premium = 1 WHERE id = :userId",
        { userId: payment.user_id }
      );

      // Send Premium Activation Email
      try {
        const [users] = await pool.execute(
          "SELECT username, email FROM users WHERE id = :userId",
          { userId: payment.user_id }
        );
        if (users.length > 0) {
          const user = users[0];
          const { sendPremiumActivationEmail } = await import("../services/emailService.js");
          await sendPremiumActivationEmail(user.email, user.username);
        }
      } catch (emailErr) {
        console.error("Failed to send activation email:", emailErr);
      }
      res.json({ success: true, message: "Payment approved and user upgraded to premium." });
    }
  } catch (error) {
    next(error);
  }
}

export async function declinePayment(req, res, next) {
  try {
    const paymentId = req.params.id;

    // Update payment status to failed
    await pool.execute(
      "UPDATE payments SET status = 'failed' WHERE id = :id",
      { id: paymentId }
    );

    res.json({ success: true, message: "Payment declined successfully." });
  } catch (error) {
    next(error);
  }
}

export async function distributeCoins(req, res, next) {
  try {
    const adminId = req.user.id;
    const targetUserId = req.params.id;
    const { amount } = req.body;

    const coinsAmount = Number(amount);
    if (isNaN(coinsAmount) || coinsAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount / كمية غير صالحة" });
    }

    // 1. Get admin's current coins balance
    const [adminRows] = await pool.execute(
      "SELECT coins FROM users WHERE id = :adminId",
      { adminId }
    );
    if (adminRows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const adminCoins = adminRows[0].coins;

    if (adminCoins < coinsAmount) {
      return res.status(400).json({ 
        message: `Insufficient coins in admin balance. You have ${adminCoins} coins. / رصيد عملاتك غير كافٍ. لديك ${adminCoins} عملة.`
      });
    }

    // 2. Verify target user exists
    const [userRows] = await pool.execute(
      "SELECT id, username, coins FROM users WHERE id = :targetUserId",
      { targetUserId }
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Target user not found / المستخدم غير موجود" });
    }
    const targetUser = userRows[0];

    // 3. Deduct from admin and add to target user
    const newAdminCoins = adminCoins - coinsAmount;
    const newUserCoins = Number(targetUser.coins) + coinsAmount;

    await pool.execute(
      "UPDATE users SET coins = :newAdminCoins WHERE id = :adminId",
      { newAdminCoins, adminId }
    );

    await pool.execute(
      "UPDATE users SET coins = :newUserCoins WHERE id = :targetUserId",
      { newUserCoins, targetUserId }
    );

    // Create a notification for the receiver
    const receiveMsg = `لقد تلقيت ${coinsAmount} عملة معدنية من المشرف! / You received ${coinsAmount} coins from the admin!`;
    const io = getSocketServer();
    if (io) {
      io.to(`user:${targetUserId}`).emit("adminNotification", {
        id: `coins-received-${Date.now()}`,
        message: receiveMsg,
        createdAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Successfully transferred ${coinsAmount} coins to ${targetUser.username}. / تم تحويل ${coinsAmount} عملة إلى ${targetUser.username} بنجاح.`,
      adminCoins: newAdminCoins
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMatchAdmin(req, res, next) {
  try {
    const matchId = req.params.id;
    await deleteMatch(matchId);
    // Also try delete from archived_matches
    await pool.execute("DELETE FROM archived_matches WHERE id = :matchId", { matchId });

    res.json({ success: true, message: "Match deleted successfully / تم حذف المباراة بنجاح." });
  } catch (error) {
    next(error);
  }
}

export async function deductCoins(req, res, next) {
  try {
    const adminId = req.user.id;
    const targetUserId = req.params.id;
    const { amount } = req.body;

    const coinsAmount = Number(amount);
    if (isNaN(coinsAmount) || coinsAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount / كمية غير صالحة" });
    }

    // 1. Verify target user exists
    const [userRows] = await pool.execute(
      "SELECT id, username, coins FROM users WHERE id = :targetUserId",
      { targetUserId }
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Target user not found / المستخدم غير موجود" });
    }
    const targetUser = userRows[0];

    if (targetUser.coins < coinsAmount) {
      return res.status(400).json({
        message: `Target user only has ${targetUser.coins} coins. You cannot deduct ${coinsAmount} coins. / المستخدم لديه فقط ${targetUser.coins} عملة. لا يمكنك سحب ${coinsAmount} عملة.`
      });
    }

    // 2. Get admin's current coins balance
    const [adminRows] = await pool.execute(
      "SELECT coins FROM users WHERE id = :adminId",
      { adminId }
    );
    if (adminRows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const adminCoins = adminRows[0].coins;

    // 3. Deduct from target user and return back to admin
    const newAdminCoins = adminCoins + coinsAmount;
    const newUserCoins = Number(targetUser.coins) - coinsAmount;

    await pool.execute(
      "UPDATE users SET coins = :newAdminCoins WHERE id = :adminId",
      { newAdminCoins, adminId }
    );

    await pool.execute(
      "UPDATE users SET coins = :newUserCoins WHERE id = :targetUserId",
      { newUserCoins, targetUserId }
    );

    // Create a notification for the receiver
    const receiveMsg = `تم سحب ${coinsAmount} عملة معدنية من حسابك بواسطة المشرف! / ${coinsAmount} coins were withdrawn from your account by the admin!`;
    const io = getSocketServer();
    if (io) {
      io.to(`user:${targetUserId}`).emit("adminNotification", {
        id: `coins-withdrawn-${Date.now()}`,
        message: receiveMsg,
        createdAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Successfully withdrew ${coinsAmount} coins from ${targetUser.username}. / تم سحب ${coinsAmount} عملة من ${targetUser.username} بنجاح.`,
      adminCoins: newAdminCoins
    });
  } catch (error) {
    next(error);
  }
}

