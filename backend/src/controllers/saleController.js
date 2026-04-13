import { Sale } from "../models/Sale.js";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decreaseStockFromSale, restoreStockFromCancelledSale, validateStockForSale } from "../services/inventoryService.js";
import { addPointsToUser, applyWalletBalance, calculateGeneratedPoints } from "../services/pointsService.js";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "../services/auditService.js";

export const mySales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = { client: req.user._id, cancelled: { $ne: true } };
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total, sumResult] = await Promise.all([
    Sale.find(filter).populate("items.product", "name sku salePrice").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Sale.countDocuments(filter),
    Sale.aggregate([{ $match: filter }, { $group: { _id: null, totalSpent: { $sum: "$finalCharged" } } }])
  ]);
  const totalSpent = sumResult[0]?.totalSpent ?? 0;
  res.json({ items, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)), totalSpent });
});

export const listSales = asyncHandler(async (req, res) => {
  const { client, page = 1, limit = 20, dateFrom, dateTo, includeCancelled } = req.query;
  const filter = client ? { client } : {};
  if (includeCancelled !== "1" && includeCancelled !== "true") filter.cancelled = { $ne: true };
  if (dateFrom) {
    filter.createdAt = filter.createdAt || {};
    filter.createdAt.$gte = new Date(dateFrom);
  }
  if (dateTo) {
    filter.createdAt = filter.createdAt || {};
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    filter.createdAt.$lte = to;
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total, agg, byPayment] = await Promise.all([
    Sale.find(filter).populate("client", "name email").populate("items.product", "name sku").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Sale.countDocuments(filter),
    Sale.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: "$finalCharged" } } }]),
    Sale.aggregate([
      { $match: filter },
      { $group: { _id: "$paymentMethod", total: { $sum: "$finalCharged" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  const periodTotal = agg[0]?.sum ?? 0;
  res.json({
    items,
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
    periodTotal,
    byPayment
  });
});

export const createSale = asyncHandler(async (req, res) => {
  const items = await Promise.all(
    req.body.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) throw new ApiError("Producto no encontrado en venta", 404);
      const subtotal = product.salePrice * item.quantity;
      return {
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal
      };
    })
  );

  const total = items.reduce((acc, item) => acc + item.subtotal, 0);
  const walletApplied = await applyWalletBalance(req.body.client, total);
  const finalCharged = total - walletApplied;
  const generatedPoints = calculateGeneratedPoints(finalCharged);

  await validateStockForSale(items.map((it) => ({ product: it.product, quantity: it.quantity })));

  const sale = await Sale.create({
    client: req.body.client,
    paymentMethod: req.body.paymentMethod,
    items,
    total,
    walletApplied,
    finalCharged,
    generatedPoints,
    soldBy: req.user._id
  });

  await decreaseStockFromSale(items);
  await addPointsToUser(req.body.client, generatedPoints, sale._id);
  await writeAuditLog({
    userId: req.user._id,
    action: "create",
    entity: "sale",
    entityId: sale._id.toString(),
    metadata: { route: req.originalUrl, total, finalCharged, generatedPoints },
    after: sale.toObject()
  });
  res.status(201).json(sale);
});

export const cancelSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate("items.product", "name");
  if (!sale) throw new ApiError("Venta no encontrada", 404);
  if (sale.cancelled) throw new ApiError("Esta venta ya está cancelada", 400);
  await restoreStockFromCancelledSale(sale.items);
  sale.cancelled = true;
  sale.cancelledAt = new Date();
  sale.cancelledBy = req.user._id;
  await sale.save();
  await writeAuditLog({
    userId: req.user._id,
    action: "update",
    entity: "sale",
    entityId: sale._id.toString(),
    metadata: { route: req.originalUrl, cancelled: true },
    after: sale.toObject()
  });
  res.json(sale);
});
