import { Router } from "express";
import { attendAlert, listAlerts } from "../controllers/alertController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect);
router.get("/", authorizePermission(PERMISSIONS.ALERTS_READ), listAlerts);
router.patch("/:id/attend", authorizePermission(PERMISSIONS.ALERTS_ATTEND), attendAlert);

export default router;
