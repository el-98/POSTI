import { Purchase } from "../models/Purchase.js";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { increaseStockFromPurchase } from "../services/inventoryService.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

/** Lista de proveedores únicos (compras + productos) para no duplicar al registrar */
export const listSuppliers = asyncHandler(async (req, res) => {
  const [fromPurchases, fromProducts] = await Promise.all([
    Purchase.distinct("supplier"),
    Product.distinct("supplier")
  ]);
  const set = new Set([...fromPurchases, ...fromProducts].map((s) => String(s || "").trim()).filter(Boolean));
  const suppliers = Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  res.json({ suppliers });
});

export const listPurchases = asyncHandler(async (req, res) => {
  const { supplier, page = 1, limit = 20 } = req.query;
  const filter = supplier ? { supplier: new RegExp(supplier, "i") } : {};
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Purchase.find(filter).populate("items.product", "name sku").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Purchase.countDocuments(filter)
  ]);
  res.json({ items, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const items = await Promise.all(
    req.body.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) throw new ApiError("Producto no encontrado en compra", 404);
      return { ...item, product: product._id };
    })
  );

  const totalCost = items.reduce((acc, item) => acc + item.cost * item.quantity, 0);
  const supplierNorm = String(req.body.supplier || "").trim();
  if (!supplierNorm) throw new ApiError("El proveedor es obligatorio", 400);
  const purchase = await Purchase.create({
    supplier: supplierNorm,
    items,
    totalCost,
    createdBy: req.user._id
  });
  await increaseStockFromPurchase(items);
  await writeAuditLog({
    userId: req.user._id,
    action: "create",
    entity: "purchase",
    entityId: purchase._id.toString(),
    metadata: { route: req.originalUrl, itemsCount: items.length },
    after: purchase.toObject()
  });
  res.status(201).json(purchase);
});
