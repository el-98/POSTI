import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

const SKU_PREFIX = "SKU";

/** Genera el siguiente SKU automático (SKU-000001, SKU-000002, ...) */
async function getNextAutoSku() {
  const list = await Product.find({ sku: new RegExp(`^${SKU_PREFIX}-\\d+$`) }).select("sku").lean();
  let maxNum = 0;
  for (const p of list) {
    const n = parseInt(p.sku.replace(SKU_PREFIX, "").replace(/-/g, ""), 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return `${SKU_PREFIX}-${String(maxNum + 1).padStart(6, "0")}`;
}

export const createProduct = asyncHandler(async (req, res) => {
  const skuTrim = String(req.body.sku || "").trim();
  let skuFinal = skuTrim;
  if (!skuFinal) {
    skuFinal = await getNextAutoSku();
  } else {
    const existing = await Product.findOne({ sku: new RegExp(`^${skuTrim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (existing) throw new ApiError("Ya existe un producto con este SKU. Usa otro SKU o déjalo en blanco para que se asigne automático.", 400);
  }
  const product = await Product.create({ ...req.body, sku: skuFinal });
  await writeAuditLog({
    userId: req.user._id,
    action: "create",
    entity: "product",
    entityId: product._id.toString(),
    metadata: { route: req.originalUrl },
    after: product.toObject()
  });
  res.status(201).json(product);
});

/** Subida de imagen de producto: devuelve la ruta pública del archivo (/uploads/xxx) */
export const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError("No se envió ninguna imagen", 400);
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError("Producto no encontrado", 404);
  const before = product.toObject();
  const allowed = ["name", "category", "purchasePrice", "salePrice", "currentStock", "minStock", "supplier", "barcode", "imageUrl", "active"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) product.set(key, req.body[key]);
  }
  await product.save();
  await writeAuditLog({
    userId: req.user._id,
    action: "update",
    entity: "product",
    entityId: product._id.toString(),
    metadata: { route: req.originalUrl },
    before,
    after: product.toObject()
  });
  res.json(product);
});

export const listProducts = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
  const filter = includeInactive ? {} : { $or: [{ active: true }, { active: { $exists: false } }] };
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products);
});

export const criticalProducts = asyncHandler(async (req, res) => {
  const filter = { $expr: { $lte: ["$currentStock", "$minStock"] }, $or: [{ active: true }, { active: { $exists: false } }] };
  const products = await Product.find(filter);
  res.json(products);
});
