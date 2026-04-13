import { AuditLog } from "../models/AuditLog.js";

export const activityLogger = (action, entity) => async (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode < 400) {
      await AuditLog.create({
        user: req.user?._id,
        action,
        entity,
        entityId: req.params.id,
        metadata: { method: req.method, path: req.originalUrl }
      });
    }
  });
  next();
};
