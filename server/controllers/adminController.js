import { pool } from "../config/db.js";
import { listAllUsers, deleteUserById, banUserById, unbanUserById, findUserById } from "../models/User.js";
import { listAllMatches, countMatches, getMatchById } from "../models/Match.js";
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
