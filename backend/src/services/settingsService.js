import { env } from "../config/env.js";
import { AppSetting } from "../models/AppSetting.js";

const SETTINGS_KEYS = {
  ACK_RETENTION_HOURS: "ACK_RETENTION_HOURS"
};

export const getAckRetentionHours = async () => {
  const setting = await AppSetting.findOne({ key: SETTINGS_KEYS.ACK_RETENTION_HOURS }).select("value");
  const value = Number(setting?.value);
  if (!Number.isFinite(value) || value <= 0) return env.ackRetentionHours;
  return value;
};

export const getSystemSettings = async () => {
  return {
    ackRetentionHours: await getAckRetentionHours()
  };
};

export const updateSystemSettings = async ({ ackRetentionHours, updatedBy }) => {
  await AppSetting.findOneAndUpdate(
    { key: SETTINGS_KEYS.ACK_RETENTION_HOURS },
    { key: SETTINGS_KEYS.ACK_RETENTION_HOURS, value: Number(ackRetentionHours), updatedBy },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return getSystemSettings();
};
