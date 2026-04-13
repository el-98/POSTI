import { randomUUID } from "node:crypto";
import { Repair } from "../models/Repair.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

export const myRepairs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { client: req.user._id };
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Repair.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Repair.countDocuments(filter)
  ]);
  res.json({ items, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) });
});

export const listRepairs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Repair.find(filter).populate("client", "name email").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Repair.countDocuments(filter)
  ]);
  res.json({ items, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) });
});

export const createRepair = asyncHandler(async (req, res) => {
  const trackingNumber = `REP-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const repair = await Repair.create({
    ...req.body,
    trackingNumber,
    status: "Recibido",
    history: [{ status: "Recibido", note: "Equipo recibido", changedBy: req.user._id }]
  });
  await writeAuditLog({
    userId: req.user._id,
    action: "create",
    entity: "repair",
    entityId: repair._id.toString(),
    metadata: { route: req.originalUrl, trackingNumber: repair.trackingNumber },
    after: repair.toObject()
  });
  res.status(201).json(repair);
});

export const updateRepairStatus = asyncHandler(async (req, res) => {
  const repair = await Repair.findById(req.params.id);
  if (!repair) throw new ApiError("Reparación no encontrada", 404);
  const before = repair.toObject();
  repair.status = req.body.status;
  repair.history.push({ status: req.body.status, note: req.body.note || "", changedBy: req.user._id });
  if (req.body.status === "Entregado") repair.deliveredDate = new Date();
  await repair.save();
  await writeAuditLog({
    userId: req.user._id,
    action: "update",
    entity: "repair",
    entityId: repair._id.toString(),
    metadata: { route: req.originalUrl },
    before,
    after: repair.toObject()
  });
  res.json(repair);
});

export const getRepairByTracking = asyncHandler(async (req, res) => {
  const repair = await Repair.findOne({ trackingNumber: req.params.trackingNumber }).populate(
    "client",
    "name email"
  );
  if (!repair) throw new ApiError("No existe seguimiento", 404);
  res.json(repair);
});
