import { AuditLog } from "../models/AuditLog.js";
import { diffObjects } from "../utils/objectDiff.js";

export const writeAuditLog = async ({ userId, action, entity, entityId, metadata, before, after }) => {
  const safeBefore = before ? JSON.parse(JSON.stringify(before)) : undefined;
  const safeAfter = after ? JSON.parse(JSON.stringify(after)) : undefined;

  await AuditLog.create({
    user: userId,
    action,
    entity,
    entityId,
    metadata,
    before: safeBefore,
    after: safeAfter,
    diff: safeBefore && safeAfter ? diffObjects(safeBefore, safeAfter) : undefined
  });
};
