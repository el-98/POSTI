import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

const DEFAULT_CLIENT_PASSWORD = "12345678";
const CLIENT_CODE_PREFIX = "C-";

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const clientProjection = "_id name email clientCode accountType";

export const createClient = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) throw new ApiError("El nombre del cliente es obligatorio", 400);
  const accountType = req.body.accountType === "frecuente" ? "frecuente" : "ocasional";
  const last = await User.findOne({ role: "cliente", clientCode: /^C-\d+$/ }).sort({ clientCode: -1 }).select("clientCode").lean();
  const nextNum = last?.clientCode ? parseInt(last.clientCode.replace(CLIENT_CODE_PREFIX, ""), 10) + 1 : 1000;
  const clientCode = `${CLIENT_CODE_PREFIX}${nextNum}`;
  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);
  const email = `cliente-${clientCode.replace("-", "")}@posit.local`;
  let exists = await User.findOne({ $or: [{ email }, { clientCode }] });
  let finalCode = clientCode;
  if (exists) {
    finalCode = `${CLIENT_CODE_PREFIX}${nextNum + Date.now() % 100000}`;
    const altEmail = `cliente-${finalCode.replace(/-/g, "")}@posit.local`;
    const user = await User.create({
      name,
      email: altEmail,
      password: await bcrypt.hash(DEFAULT_CLIENT_PASSWORD, 10),
      role: "cliente",
      accountType,
      clientCode: finalCode,
      pinHash
    });
    const client = await User.findById(user._id).select(clientProjection).lean();
    return res.status(201).json({ ...client, pin });
  }
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(DEFAULT_CLIENT_PASSWORD, 10),
    role: "cliente",
    accountType,
    clientCode: finalCode,
    pinHash
  });
  const client = await User.findById(user._id).select(clientProjection).lean();
  res.status(201).json({ ...client, pin });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -pinHash").sort({ createdAt: -1 });
  res.json(users);
});

export const listClients = asyncHandler(async (req, res) => {
  const users = await User.find({ role: "cliente" }).select("_id name email walletBalance clientCode accountType").sort({ name: 1 }).lean();
  res.json(users);
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: "cliente" }).select("-password -pinHash");
  if (!client) throw new ApiError("Cliente no encontrado", 404);
  if (req.body.name != null) client.name = String(req.body.name).trim();
  if (req.body.accountType === "frecuente" || req.body.accountType === "ocasional") client.accountType = req.body.accountType;
  await client.save();
  const updated = await User.findById(client._id).select("_id name email clientCode accountType walletBalance").lean();
  res.json(updated);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  if (req.body.role === "admin") {
    throw new ApiError("No se puede asignar el rol administrador. Solo existe un administrador en el sistema.", 403);
  }
  const existingUser = await User.findById(req.params.id).select("-password");
  if (!existingUser) throw new ApiError("Usuario no encontrado", 404);
  const before = existingUser.toObject();
  existingUser.role = req.body.role;
  await existingUser.save();
  const user = await User.findById(existingUser._id).select("-password");
  await writeAuditLog({
    userId: req.user._id,
    action: "update-role",
    entity: "user",
    entityId: existingUser._id.toString(),
    metadata: { route: req.originalUrl },
    before,
    after: user.toObject()
  });
  res.json(user);
});
