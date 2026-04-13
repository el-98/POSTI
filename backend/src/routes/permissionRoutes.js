import { Router } from "express";
import { getPermissions, updateRolePermissions } from "../controllers/permissionController.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize, authorizePermission, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { permissionUpdateSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect);
router.get("/", authorize("admin"), authorizePermission(PERMISSIONS.PERMISSIONS_READ), getPermissions);
router.put(
  "/",
  authorize("admin"),
  authorizePermission(PERMISSIONS.PERMISSIONS_UPDATE),
  validate(permissionUpdateSchema),
  updateRolePermissions
);

export default router;
