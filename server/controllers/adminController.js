import { listAllUsers, deleteUserById, banUserById, unbanUserById } from "../models/User.js";
import { listAllMatches, countMatches } from "../models/Match.js";
import { listReports, updateReportStatus } from "../models/Report.js";
import { listNotifications } from "../models/Notification.js";
import { listTournaments } from "../models/Tournament.js";
import { createNotification } from "../models/Notification.js";
import { createTournament, updateTournament, deleteTournament } from "../models/Tournament.js";
import { countOpenReports } from "../models/Report.js";

export async function getAdminDashboard(req, res, next) {
  try {
    const users = await listAllUsers({ limit: 50 });
    const matches = await listAllMatches({ limit: 50 });
    const reports = await listReports({ status: "open", limit: 20 });
    const notifications = await listNotifications({ limit: 10 });
    const tournaments = await listTournaments({ limit: 20 });
    const openReportCount = await countOpenReports();
    const totalMatches = await countMatches();

    res.json({ users, reports, notifications, tournaments, openReportCount, matches, totalMatches });
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
    const notification = await createNotification(req.body.message);
    res.status(201).json({ notification });
  } catch (error) {
    next(error);
  }
}

export async function createAdminTournament(req, res, next) {
  try {
    const tournament = await createTournament(req.body);
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
