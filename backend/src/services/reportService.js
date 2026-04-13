import { Sale } from "../models/Sale.js";
import { Product } from "../models/Product.js";
import { Repair } from "../models/Repair.js";
import { User } from "../models/User.js";

const activeProductFilter = { $or: [{ active: true }, { active: { $exists: false } }] };
const notCancelledSaleMatch = { $match: { cancelled: { $ne: true } } };

/** Reporte de productos con faltantes: en cero o por debajo del mínimo (solo activos) */
export const getFaltantesReport = async () => {
  const [enCero, bajoMinimo] = await Promise.all([
    Product.find({ currentStock: 0, ...activeProductFilter }).select("name sku category currentStock minStock supplier salePrice purchasePrice").sort({ name: 1 }).lean(),
    Product.find({ $and: [{ currentStock: { $gt: 0 } }, { $expr: { $lte: ["$currentStock", "$minStock"] } }, activeProductFilter] })
      .select("name sku category currentStock minStock supplier salePrice purchasePrice")
      .sort({ currentStock: 1 })
      .lean()
  ]);
  return {
    enCero,
    bajoMinimo,
    totalEnCero: enCero.length,
    totalBajoMinimo: bajoMinimo.length,
    totalFaltantes: enCero.length + bajoMinimo.length,
    generatedAt: new Date().toISOString()
  };
};

export const getDashboardReport = async () => {
  const [salesByMonth, topProducts, lowStock, pendingRepairs, topClients, clientsByTypeAgg] = await Promise.all([
    Sale.aggregate([
      notCancelledSaleMatch,
      { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$finalCharged" } } },
      { $sort: { _id: 1 } }
    ]),
    Sale.aggregate([
      notCancelledSaleMatch,
      { $unwind: "$items" },
      { $group: { _id: "$items.product", soldQty: { $sum: "$items.quantity" } } },
      { $sort: { soldQty: -1 } },
      { $limit: 10 },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDoc" } },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, soldQty: 1, name: "$productDoc.name", sku: "$productDoc.sku" } }
    ]),
    Product.find({ $expr: { $lte: ["$currentStock", "$minStock"] }, ...activeProductFilter }).select("name sku currentStock minStock"),
    Repair.countDocuments({ status: { $in: ["Recibido", "En proceso"] } }),
    Sale.aggregate([
      notCancelledSaleMatch,
      { $group: { _id: "$client", total: { $sum: "$finalCharged" }, purchases: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "clientDoc" } },
      { $unwind: { path: "$clientDoc", preserveNullAndEmptyArrays: true } },
      { $project: { total: 1, purchases: 1, name: "$clientDoc.name", email: "$clientDoc.email", accountType: "$clientDoc.accountType" } }
    ]),
    User.aggregate([
      { $match: { role: "cliente" } },
      { $group: { _id: { $ifNull: ["$accountType", "ocasional"] }, count: { $sum: 1 } } }
    ])
  ]);

  const clientsByType = { frecuente: 0, ocasional: 0 };
  (clientsByTypeAgg || []).forEach((row) => {
    const key = row._id === "frecuente" ? "frecuente" : "ocasional";
    clientsByType[key] = row.count || 0;
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [salesTodayAgg, recentSalesList] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfToday, $lt: endOfToday }, cancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$finalCharged" }, count: { $sum: 1 } } }
    ]),
    Sale.find({ cancelled: { $ne: true } })
      .populate("client", "name email")
      .populate("items.product", "name salePrice")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
  ]);

  const salesToday = salesTodayAgg[0] ? { total: salesTodayAgg[0].total, count: salesTodayAgg[0].count } : { total: 0, count: 0 };

  const totalSales = await Sale.aggregate([notCancelledSaleMatch, { $group: { _id: null, amount: { $sum: "$finalCharged" } } }]);
  const totalCost = await Sale.aggregate([
    notCancelledSaleMatch,
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productData"
      }
    },
    { $unwind: "$productData" },
    { $group: { _id: null, cost: { $sum: { $multiply: ["$items.quantity", "$productData.purchasePrice"] } } } }
  ]);
  const gain = (totalSales[0]?.amount || 0) - (totalCost[0]?.cost || 0);

  return {
    salesByMonth,
    topProducts,
    gain,
    pendingRepairs,
    lowStock,
    topClients,
    clientsByType,
    totalUsers: await User.countDocuments(),
    salesToday,
    recentSales: recentSalesList
  };
};

/** Resumen del día para corte de caja */
export const getCorteCaja = async (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [summary, byPayment, salesList] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, cancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$finalCharged" }, count: { $sum: 1 } } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, cancelled: { $ne: true } } },
      { $group: { _id: "$paymentMethod", total: { $sum: "$finalCharged" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Sale.find({ createdAt: { $gte: start, $lt: end }, cancelled: { $ne: true } })
      .populate("client", "name email")
      .populate("items.product", "name salePrice")
      .sort({ createdAt: 1 })
      .lean()
  ]);

  return {
    date: start.toISOString().slice(0, 10),
    total: summary[0]?.total ?? 0,
    count: summary[0]?.count ?? 0,
    byPaymentMethod: byPayment.map((p) => ({ method: p._id, total: p.total, count: p.count })),
    sales: salesList
  };
};
