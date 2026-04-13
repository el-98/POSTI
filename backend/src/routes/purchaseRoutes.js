import { Router } from "express";
import {
  createPurchase,
  listPurchases,
  listSuppliers
} from "../controllers/purchaseController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { PERMISSIONS } from "../config/permissions.js";
import { purchaseSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect, authorizePermission(PERMISSIONS.PURCHASES_CREATE));
router.get("/suppliers", listSuppliers);
router.get("/", listPurchases);
router.post("/", validate(purchaseSchema), createPurchase);

export default router;
