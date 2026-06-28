import { z } from "zod";
import { createReport } from "../models/Report.js";
import { findUserById, findUserByInviteCode } from "../models/User.js";

export const reportSchema = z.object({
  reported_user_id: z.union([z.number().int(), z.string()]).optional(),
  type: z.enum(["player", "problem"]),
  message: z.string().trim().min(10).max(1000)
});

export async function submitReport(req, res, next) {
  try {
    let reportedUserId = req.body.reported_user_id;

    if (req.body.type === "player" && reportedUserId !== undefined && reportedUserId !== null && reportedUserId !== "") {
      const searchStr = String(reportedUserId).trim();
      // 1. Try finding by invite_code first
      const userByInvite = await findUserByInviteCode(searchStr);
      if (userByInvite) {
        reportedUserId = userByInvite.id;
      } else {
        // 2. If not found by invite, check if it's a valid integer ID
        if (/^\d+$/.test(searchStr)) {
          const userById = await findUserById(Number(searchStr));
          if (userById) {
            reportedUserId = userById.id;
          } else {
            return res.status(404).json({ message: "Reported player not found" });
          }
        } else {
          return res.status(404).json({ message: "Reported player not found" });
        }
      }
    } else if (req.body.type === "player") {
      return res.status(400).json({ message: "Player ID is required for player reports" });
    }

    const report = await createReport({
      reporterId: req.user.id,
      reportedUserId: reportedUserId || null,
      type: req.body.type,
      message: req.body.message
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
}
