import { Router } from "express";
import { cancelSale, createSale, listSales, mySales } from "../controllers/saleController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { PERMISSIONS } from "../config/permissions.js";
import { saleSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect);
router.get("/me", mySales);
router.get("/", authorizePermission(PERMISSIONS.SALES_CREATE), listSales);
router.post("/", authorizePermission(PERMISSIONS.SALES_CREATE), validate(saleSchema), createSale);
router.patch("/:id/cancel", authorizePermission(PERMISSIONS.SALES_CREATE), cancelSale);

export default router;
