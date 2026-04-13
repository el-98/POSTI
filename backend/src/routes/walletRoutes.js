import { Router } from "express";
import { myWallet, clientWallet } from "../controllers/walletController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect, authorizePermission(PERMISSIONS.WALLET_READ));
router.get("/me", myWallet);
router.get("/client/:clientId", clientWallet);

export default router;
