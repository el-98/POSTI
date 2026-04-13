import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDashboardReport, getCorteCaja, getFaltantesReport } from "../services/reportService.js";

export const dashboardReport = asyncHandler(async (req, res) => {
  const report = await getDashboardReport();
  res.json(report);
});

export const corteReport = asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const corte = await getCorteCaja(date);
  res.json(corte);
});

/** Reporte de faltantes en inventario (productos en cero o bajo mínimo) */
export const faltantesReport = asyncHandler(async (req, res) => {
  const report = await getFaltantesReport();
  res.json(report);
});

export const exportReportExcel = asyncHandler(async (req, res) => {
  const report = await getDashboardReport();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dashboard");
  sheet.addRow(["Métrica", "Valor"]);
  sheet.addRow(["Ganancia total", report.gain]);
  sheet.addRow(["Reparaciones pendientes", report.pendingRepairs]);
  sheet.addRow(["Usuarios totales", report.totalUsers]);
  sheet.addRow(["Clientes frecuentes", report.clientsByType?.frecuente ?? 0]);
  sheet.addRow(["Clientes ocasionales", report.clientsByType?.ocasional ?? 0]);
  sheet.addRow([]);
  sheet.addRow(["Productos con stock bajo o faltante", (report.lowStock?.length ?? 0)]);
  if ((report.lowStock?.length ?? 0) > 0) {
    sheet.addRow(["Producto", "SKU", "Stock actual", "Mínimo"]);
    report.lowStock.forEach((p) => sheet.addRow([p.name, p.sku, p.currentStock, p.minStock]));
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=reporte.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

export const exportReportPdf = asyncHandler(async (req, res) => {
  const report = await getDashboardReport();
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=reporte.pdf");
  doc.pipe(res);
  doc.fontSize(18).text("Reporte Inteligente ITCOMMERCE");
  doc.moveDown();
  doc.fontSize(12).text(`Ganancia total: ${report.gain}`);
  doc.text(`Reparaciones pendientes: ${report.pendingRepairs}`);
  doc.text(`Usuarios totales: ${report.totalUsers}`);
  doc.text(`Clientes frecuentes: ${report.clientsByType?.frecuente ?? 0}`);
  doc.text(`Clientes ocasionales: ${report.clientsByType?.ocasional ?? 0}`);
  doc.moveDown();
  doc.text(`Productos con faltantes (bajo mínimo): ${report.lowStock?.length ?? 0}`);
  if ((report.lowStock?.length ?? 0) > 0) {
    doc.moveDown(0.5);
    report.lowStock.forEach((p) => doc.fontSize(10).text(`• ${p.name} — Stock: ${p.currentStock} / Mín: ${p.minStock}`));
  }
  doc.end();
});

/** Exportar solo reporte de faltantes en Excel */
export const exportFaltantesExcel = asyncHandler(async (req, res) => {
  const report = await getFaltantesReport();
  const workbook = new ExcelJS.Workbook();
  const sheetCero = workbook.addWorksheet("En cero");
  sheetCero.addRow(["Producto", "SKU", "Categoría", "Stock", "Mínimo", "Proveedor", "Precio venta", "Precio compra"]);
  (report.enCero || []).forEach((p) => sheetCero.addRow([p.name, p.sku, p.category, p.currentStock, p.minStock, p.supplier, p.salePrice, p.purchasePrice]));
  const sheetBajo = workbook.addWorksheet("Bajo mínimo");
  sheetBajo.addRow(["Producto", "SKU", "Categoría", "Stock actual", "Mínimo", "Faltante", "Proveedor"]);
  (report.bajoMinimo || []).forEach((p) => sheetBajo.addRow([p.name, p.sku, p.category, p.currentStock, p.minStock, (p.minStock || 0) - (p.currentStock || 0), p.supplier]));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=reporte-faltantes.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

/** Exportar solo reporte de faltantes en PDF */
export const exportFaltantesPdf = asyncHandler(async (req, res) => {
  const report = await getFaltantesReport();
  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=reporte-faltantes.pdf");
  doc.pipe(res);
  doc.fontSize(18).text("Reporte de Faltantes en Inventario");
  doc.fontSize(10).text(`Generado: ${report.generatedAt ? new Date(report.generatedAt).toLocaleString() : ""}`);
  doc.moveDown();
  doc.fontSize(12).text(`Total productos en cero: ${report.totalEnCero ?? 0}`);
  doc.text(`Total productos bajo mínimo: ${report.totalBajoMinimo ?? 0}`);
  doc.text(`Total con faltantes: ${report.totalFaltantes ?? 0}`);
  doc.moveDown();
  if ((report.enCero?.length ?? 0) > 0) {
    doc.fontSize(12).text("Productos en cero:");
    (report.enCero || []).forEach((p) => doc.fontSize(10).text(`• ${p.name} (${p.sku}) — ${p.category} — Proveedor: ${p.supplier || "—"}`));
    doc.moveDown();
  }
  if ((report.bajoMinimo?.length ?? 0) > 0) {
    doc.fontSize(12).text("Productos bajo mínimo:");
    (report.bajoMinimo || []).forEach((p) => doc.fontSize(10).text(`• ${p.name} (${p.sku}) — Stock: ${p.currentStock} / Mín: ${p.minStock} — Faltan: ${(p.minStock || 0) - (p.currentStock || 0)}`));
  }
  doc.end();
});
