import { Router } from "express";
import { createProduct, criticalProducts, listProducts, updateProduct, uploadProductImage as uploadProductImageCtrl } from "../controllers/productController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { uploadProductImage } from "../middlewares/uploadProductImage.js";
import { PERMISSIONS } from "../config/permissions.js";
import { productSchema, productUpdateSchema } from "../validators/schemas.js";

const router = Router();

router.use(protect);
router.get("/", authorizePermission(PERMISSIONS.PRODUCTS_READ), listProducts);
router.get("/critical", authorizePermission(PERMISSIONS.PRODUCTS_READ), criticalProducts);
router.post("/upload", authorizePermission(PERMISSIONS.PRODUCTS_CREATE), uploadProductImage, uploadProductImageCtrl);
router.post("/", authorizePermission(PERMISSIONS.PRODUCTS_CREATE), validate(productSchema), createProduct);
router.patch("/:id", authorizePermission(PERMISSIONS.PRODUCTS_CREATE), validate(productUpdateSchema), updateProduct);

export default router;
