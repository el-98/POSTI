import { Router } from "express";
import {
  exportSettingsHistoryCsv,
  exportSettingsHistoryExcel,
  getSettings,
  getSettingsHistory,
  getSettingsHistorySummary,
  putSettings
} from "../controllers/settingsController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { settingsSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect, authorize("admin"));
router.get("/", getSettings);
router.get("/history", getSettingsHistory);
router.get("/history/summary", getSettingsHistorySummary);
router.get("/history/export/csv", exportSettingsHistoryCsv);
router.get("/history/export/excel", exportSettingsHistoryExcel);
router.put("/", validate(settingsSchema), putSettings);

export default router;
