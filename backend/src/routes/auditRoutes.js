import { Router } from "express";
import {
  auditSummary,
  exportAcknowledgementsCsv,
  exportAcknowledgementsExcel,
  exportAuditCsv,
  exportAuditExcel,
  listAnomalyAcknowledgements,
  listAuditLogs
} from "../controllers/auditController.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize, authorizePermission, protect } from "../middlewares/auth.js";

const router = Router();

router.use(protect, authorizePermission(PERMISSIONS.AUDIT_READ));
router.get("/", listAuditLogs);
router.get("/summary", auditSummary);
router.get("/acknowledgements", authorize("admin"), listAnomalyAcknowledgements);
router.get("/acknowledgements/export/csv", authorize("admin"), exportAcknowledgementsCsv);
router.get("/acknowledgements/export/excel", authorize("admin"), exportAcknowledgementsExcel);
router.get("/export/csv", exportAuditCsv);
router.get("/export/excel", exportAuditExcel);

export default router;
