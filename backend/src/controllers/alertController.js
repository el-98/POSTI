import { Alert } from "../models/Alert.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

export const listAlerts = asyncHandler(async (req, res) => {
  const alerts = await Alert.find().populate("product", "name sku currentStock minStock").sort({ createdAt: -1 });
  res.json(alerts);
});

export const attendAlert = asyncHandler(async (req, res) => {
  const existingAlert = await Alert.findById(req.params.id);
  if (!existingAlert) throw new ApiError("Alerta no encontrada", 404);
  const before = existingAlert.toObject();
  existingAlert.attended = true;
  await existingAlert.save();
  const alert = await Alert.findById(existingAlert._id);
  await writeAuditLog({
    userId: req.user._id,
    action: "attend",
    entity: "alert",
    entityId: alert._id.toString(),
    metadata: { route: req.originalUrl },
    before,
    after: alert.toObject()
  });
  res.json(alert);
});
