import { Router } from "express";
import { listUsers, listClients, createClient, updateClient, updateUserRole } from "../controllers/userController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { PERMISSIONS } from "../config/permissions.js";
import { validate } from "../middlewares/validate.js";
import { updateRoleSchema, createClientSchema, updateClientSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect);
router.get("/clients", authorizePermission(PERMISSIONS.SALES_CREATE), listClients);
router.post("/clients", authorizePermission(PERMISSIONS.SALES_CREATE), validate(createClientSchema), createClient);
router.patch("/clients/:id", authorizePermission(PERMISSIONS.SALES_CREATE), validate(updateClientSchema), updateClient);
router.get("/", authorizePermission(PERMISSIONS.USERS_READ), listUsers);
router.patch("/:id/role", authorizePermission(PERMISSIONS.USERS_UPDATE_ROLE), validate(updateRoleSchema), updateUserRole);

export default router;
