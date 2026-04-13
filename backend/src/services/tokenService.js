import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/RefreshToken.js";

export const createAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.accessSecret, { expiresIn: env.accessExpires });

export const createAndStoreRefreshToken = async (user, deviceId) => {
  const token = jwt.sign({ id: user._id, deviceId }, env.refreshSecret, { expiresIn: env.refreshExpires });
  const decoded = jwt.decode(token);
  await RefreshToken.create({
    user: user._id,
    token,
    deviceId,
    expiresAt: new Date(decoded.exp * 1000)
  });
  return token;
};

export const rotateRefreshToken = async (oldToken, deviceId) => {
  const payload = jwt.verify(oldToken, env.refreshSecret);
  const tokenDoc = await RefreshToken.findOne({
    token: oldToken,
    user: payload.id,
    deviceId,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!tokenDoc) throw new Error("Refresh token inválido");

  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();
  return payload.id;
};

export const revokeDeviceTokens = async (userId, deviceId) => {
  await RefreshToken.updateMany(
    { user: userId, deviceId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};
