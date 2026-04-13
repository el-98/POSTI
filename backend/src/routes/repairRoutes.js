import { Router } from "express";
import { createRepair, listRepairs, myRepairs, updateRepairStatus } from "../controllers/repairController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { PERMISSIONS } from "../config/permissions.js";
import { repairSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect);
router.get("/me", myRepairs);
router.get("/", authorizePermission(PERMISSIONS.REPAIRS_CREATE), listRepairs);
router.post("/", authorizePermission(PERMISSIONS.REPAIRS_CREATE), validate(repairSchema), createRepair);
router.patch("/:id/status", authorizePermission(PERMISSIONS.REPAIRS_UPDATE_STATUS), updateRepairStatus);

export default router;
