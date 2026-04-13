import { Router } from "express";
import { getRepairByTracking } from "../controllers/repairController.js";

const router = Router();

router.get("/repair-status/:trackingNumber", getRepairByTracking);

export default router;
