import { z } from "zod";
import { createReport } from "../models/Report.js";

export const reportSchema = z.object({
  reported_user_id: z.number().int().optional(),
  type: z.enum(["player", "problem"]),
  message: z.string().trim().min(10).max(1000)
});

export async function submitReport(req, res, next) {
  try {
    const report = await createReport({
      reporterId: req.user.id,
      reportedUserId: req.body.reported_user_id,
      type: req.body.type,
      message: req.body.message
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
}
