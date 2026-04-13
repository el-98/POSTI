import { User } from "../models/User.js";
import { WalletMovement } from "../models/WalletMovement.js";
import { PointsMovement } from "../models/PointsMovement.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

function buildWalletPayload(user, movements, pointsMovements) {
  const now = new Date();
  const nextConversionDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 5, 0, 0);
  return {
    walletBalance: user.walletBalance,
    pointsAccumulated: user.pointsAccumulated,
    pointsRate: env.pointsRate,
    pointsToWalletRate: env.pointsToWalletRate,
    nextConversionDate,
    movements,
    pointsMovements,
    clientName: user.name,
    clientEmail: user.email
  };
}

export const myWallet = asyncHandler(async (req, res) => {
  const [movements, pointsMovements] = await Promise.all([
    WalletMovement.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50),
    PointsMovement.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)
  ]);
  const payload = buildWalletPayload(req.user, movements, pointsMovements);
  res.json(payload);
});

/** Historial de monedero y recompensas de un cliente (solo staff: admin/vendedor) */
export const clientWallet = asyncHandler(async (req, res) => {
  const clientId = req.params.clientId;
  if (req.user.role === "cliente" && String(req.user._id) !== String(clientId)) {
    throw new ApiError("No tienes permiso para ver el monedero de otro cliente", 403);
  }
  const client = await User.findById(clientId).select("name email role walletBalance pointsAccumulated");
  if (!client) throw new ApiError("Cliente no encontrado", 404);
  if (client.role !== "cliente") throw new ApiError("El usuario no es un cliente", 400);
  const [movements, pointsMovements] = await Promise.all([
    WalletMovement.find({ user: client._id }).sort({ createdAt: -1 }).limit(100),
    PointsMovement.find({ user: client._id }).sort({ createdAt: -1 }).limit(100)
  ]);
  const payload = buildWalletPayload(client, movements, pointsMovements);
  res.json(payload);
});
