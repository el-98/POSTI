import cron from "node-cron";
import { AuditLog } from "../models/AuditLog.js";
import { env } from "../config/env.js";

export const runAuditRetentionJob = () => {
  // Ejecuta diario a las 03:30, borrando logs antiguos según política.
  cron.schedule("30 3 * * *", async () => {
    const cutoff = new Date(Date.now() - env.auditRetentionDays * 24 * 60 * 60 * 1000);
    await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
  });
};
