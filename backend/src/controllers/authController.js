import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import {
  createAccessToken,
  createAndStoreRefreshToken,
  revokeDeviceTokens,
  rotateRefreshToken
} from "../services/tokenService.js";

export const clientAccess = asyncHandler(async (req, res) => {
  const clientCode = String(req.body.clientCode || "").trim().toUpperCase();
  const pin = String(req.body.pin || "").trim();
  const user = await User.findOne({ role: "cliente", clientCode });
  if (!user) throw new ApiError("Código o PIN incorrectos", 401);
  if (!user.pinHash) throw new ApiError("Este cliente no tiene PIN asignado. Contacte al negocio.", 403);
  const ok = await bcrypt.compare(pin, user.pinHash);
  if (!ok) throw new ApiError("Código o PIN incorrectos", 401);
  const accessToken = createAccessToken(user);
  res.json({
    accessToken,
    user: { id: user._id, name: user.name, role: user.role, email: user.email }
  });
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const emailNorm = String(email).toLowerCase().trim();

  const exists = await User.findOne({ email: emailNorm });
  if (exists) throw new ApiError("Este correo ya está registrado", 409);

  const allowedRole = role === "vendedor" ? "vendedor" : "cliente";
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: String(name).trim(),
    email: emailNorm,
    password: hashed,
    role: allowedRole
  });
  res.status(201).json({ id: user._id, email: user.email, role: user.role });
});

const DEFAULT_ADMIN_EMAIL = "admin@posit.local";

export const login = asyncHandler(async (req, res) => {
  const emailNorm = String(req.body.email || "").toLowerCase().trim();
  const user = await User.findOne({ email: emailNorm });
  if (!user) {
    if (emailNorm === (env.initialAdminEmail || DEFAULT_ADMIN_EMAIL).toLowerCase().trim()) {
      throw new ApiError(
        "El administrador aún no existe. Reinicia el servidor backend (npm run dev) para crearlo automáticamente.",
        503
      );
    }
    throw new ApiError("Correo o contraseña incorrectos", 401);
  }
  const ok = await bcrypt.compare(req.body.password, user.password);
  if (!ok) throw new ApiError("Correo o contraseña incorrectos", 401);

  const deviceId = req.body.deviceId || req.headers["x-device-id"] || "default-device";
  const accessToken = createAccessToken(user);
  const refreshToken = await createAndStoreRefreshToken(user, String(deviceId));
  res.json({
    accessToken,
    refreshToken,
    deviceId: String(deviceId),
    user: { id: user._id, name: user.name, role: user.role, email: user.email }
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken, deviceId } = req.body;
  const normalizedDeviceId = String(deviceId || req.headers["x-device-id"] || "default-device");
  const userId = await rotateRefreshToken(refreshToken, normalizedDeviceId);
  const user = await User.findById(userId);
  const accessToken = createAccessToken(user);
  const newRefreshToken = await createAndStoreRefreshToken(user, normalizedDeviceId);
  res.json({ accessToken, refreshToken: newRefreshToken, deviceId: normalizedDeviceId });
});

export const me = asyncHandler(async (req, res) => {
  res.json(req.user);
});

export const logout = asyncHandler(async (req, res) => {
  const { userId, deviceId } = req.body;
  if (!userId || !deviceId) throw new ApiError("userId y deviceId son obligatorios", 400);
  await revokeDeviceTokens(userId, deviceId);
  res.json({ message: "Sesión cerrada en dispositivo" });
});

export const csrfToken = asyncHandler(async (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});
