import { Router } from "express";
import {
  dashboardReport,
  corteReport,
  faltantesReport,
  exportReportExcel,
  exportReportPdf,
  exportFaltantesExcel,
  exportFaltantesPdf
} from "../controllers/reportController.js";
import { authorizePermission, protect } from "../middlewares/auth.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = Router();

router.use(protect, authorizePermission(PERMISSIONS.REPORTS_READ));
router.get("/dashboard", dashboardReport);
router.get("/corte", corteReport);
router.get("/faltantes", faltantesReport);
router.get("/export/excel", exportReportExcel);
router.get("/export/pdf", exportReportPdf);
router.get("/export/faltantes/excel", exportFaltantesExcel);
router.get("/export/faltantes/pdf", exportFaltantesPdf);

export default router;
