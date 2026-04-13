import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { PointsMovement } from "../models/PointsMovement.js";
import { WalletMovement } from "../models/WalletMovement.js";

export const calculateGeneratedPoints = (total) => Math.floor(total * env.pointsRate);

export const applyWalletBalance = async (userId, total) => {
  const user = await User.findById(userId);
  const walletApplied = Math.min(user.walletBalance, total);
  user.walletBalance -= walletApplied;
  await user.save();
  if (walletApplied > 0) {
    await WalletMovement.create({
      user: user._id,
      type: "aplicacion",
      amount: -walletApplied,
      balanceAfter: user.walletBalance,
      note: "Aplicación automática en venta"
    });
  }
  return walletApplied;
};

export const addPointsToUser = async (userId, points, saleId) => {
  const user = await User.findById(userId);
  if (!user) return;
  const pts = Number(points) || 0;
  if (pts <= 0) return;
  user.pointsAccumulated += pts;
  await user.save();
  await PointsMovement.create({
    user: user._id,
    type: "earn",
    pointsDelta: pts,
    pointsAfter: user.pointsAccumulated,
    sale: saleId,
    note: "Puntos generados por compra"
  });
};

export const monthlyPointsToWallet = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const users = await User.find({ pointsAccumulated: { $gt: 0 } });
  for (const user of users) {
    if (user.lastPointsConversionAt && user.lastPointsConversionAt >= startOfMonth) continue;
    const pointsBefore = Number(user.pointsAccumulated) || 0;
    if (pointsBefore <= 0) continue;

    const conversion = Number((pointsBefore * env.pointsToWalletRate).toFixed(2));
    user.walletBalance += conversion;
    user.pointsAccumulated = 0;
    user.lastPointsConversionAt = now;
    await user.save();

    await PointsMovement.create({
      user: user._id,
      type: "convert",
      pointsDelta: -pointsBefore,
      pointsAfter: 0,
      note: "Conversión mensual automática de puntos"
    });

    await WalletMovement.create({
      user: user._id,
      type: "conversion",
      amount: conversion,
      balanceAfter: user.walletBalance,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      note: "Conversión mensual automática de puntos"
    });
  }
};
