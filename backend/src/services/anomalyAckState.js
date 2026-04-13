import { AnomalyAcknowledgement } from "../models/AnomalyAcknowledgement.js";
import { getAckRetentionHours } from "./settingsService.js";

export const acknowledgeAnomalyForUser = async (userId, signature) => {
  if (!userId || !signature) return;
  const retentionHours = await getAckRetentionHours();
  const ttlMs = retentionHours * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  await AnomalyAcknowledgement.findOneAndUpdate(
    { user: userId, signature },
    { user: userId, signature, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const hasUserAcknowledgedAnomaly = async (userId, signature) => {
  if (!userId || !signature) return false;
  const ack = await AnomalyAcknowledgement.findOne({
    user: userId,
    signature,
    expiresAt: { $gt: new Date() }
  }).select("_id");
  return Boolean(ack);
};
