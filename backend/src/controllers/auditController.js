import { AuditLog } from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ExcelJS from "exceljs";
import { buildAnomalySignals } from "../services/anomalyService.js";
import { AnomalyAcknowledgement } from "../models/AnomalyAcknowledgement.js";

const buildDateRangeFilter = ({ from, to }) => {
  if (!from && !to) return undefined;
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);
  return createdAt;
};

const buildFindFilter = ({ entity, action, user, from, to, q }) => {
  const filter = {};
  if (entity) filter.entity = entity;
  if (action) filter.action = action;
  if (user) filter.user = user;
  const createdAt = buildDateRangeFilter({ from, to });
  if (createdAt) filter.createdAt = createdAt;
  if (q) {
    filter.$or = [
      { entity: { $regex: q, $options: "i" } },
      { action: { $regex: q, $options: "i" } },
      { entityId: { $regex: q, $options: "i" } }
    ];
  }
  return filter;
};

const buildAggregationPipeline = ({ entity, action, user, from, to, q }) => {
  const pipeline = [];
  const match = {};
  if (entity) match.entity = entity;
  if (action) match.action = action;
  if (user) match.user = user;
  const createdAt = buildDateRangeFilter({ from, to });
  if (createdAt) match.createdAt = createdAt;
  if (Object.keys(match).length) pipeline.push({ $match: match });
  if (q) {
    pipeline.push({
      $match: {
        $text: { $search: q }
      }
    });
  }
  return pipeline;
};

const buildAckFilter = ({ user, from, to, signature }) => {
  const filter = {};
  if (user) filter.user = user;
  if (signature) filter.signature = { $regex: signature, $options: "i" };
  const createdAt = buildDateRangeFilter({ from, to });
  if (createdAt) filter.createdAt = createdAt;
  return filter;
};

const resolveComparisonRange = ({ from, to }) => {
  const now = new Date();
  const currentEnd = to ? new Date(to) : now;
  const currentStart = from ? new Date(from) : new Date(currentEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const durationMs = Math.max(currentEnd.getTime() - currentStart.getTime(), 24 * 60 * 60 * 1000);

  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { currentStart, currentEnd, previousStart, previousEnd };
};

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { entity, action, user, from, to, q, page = 1, limit = 20 } = req.query;
  const filter = buildFindFilter({ entity, action, user, from, to, q });

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(filter)
  ]);

  res.json({
    items,
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

export const exportAuditCsv = asyncHandler(async (req, res) => {
  const { entity, action, user, from, to, q } = req.query;
  const filter = buildFindFilter({ entity, action, user, from, to, q });
  const logs = await AuditLog.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).limit(5000);

  const header = ["fecha", "entidad", "accion", "entityId", "usuario", "email", "diff"].join(",");
  const lines = logs.map((log) =>
    [
      csvEscape(new Date(log.createdAt).toISOString()),
      csvEscape(log.entity || ""),
      csvEscape(log.action || ""),
      csvEscape(log.entityId || ""),
      csvEscape(log.user?.name || "sistema"),
      csvEscape(log.user?.email || ""),
      csvEscape(JSON.stringify(log.diff || []))
    ].join(",")
  );
  const csvContent = [header, ...lines].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
  res.send(csvContent);
});

export const exportAuditExcel = asyncHandler(async (req, res) => {
  const { entity, action, user, from, to, q } = req.query;
  const filter = buildFindFilter({ entity, action, user, from, to, q });
  const logs = await AuditLog.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).limit(5000);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("AuditLogs");
  sheet.addRow(["Fecha", "Entidad", "Accion", "EntityId", "Usuario", "Email", "Diff"]);
  for (const log of logs) {
    sheet.addRow([
      new Date(log.createdAt).toISOString(),
      log.entity || "",
      log.action || "",
      log.entityId || "",
      log.user?.name || "sistema",
      log.user?.email || "",
      JSON.stringify(log.diff || [])
    ]);
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=audit-logs.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

export const auditSummary = asyncHandler(async (req, res) => {
  const { entity, action, user, from, to, q } = req.query;
  const basePipeline = buildAggregationPipeline({ entity, action, user, from, to, q });
  const { currentStart, currentEnd, previousStart, previousEnd } = resolveComparisonRange({ from, to });

  const [totalLogsAgg, topActions, topEntities, dailyActivity, topUsers] = await Promise.all([
    AuditLog.aggregate([...basePipeline, { $count: "count" }]),
    AuditLog.aggregate([
      ...basePipeline,
      { $group: { _id: "$action", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 7 }
    ]),
    AuditLog.aggregate([
      ...basePipeline,
      { $group: { _id: "$entity", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 7 }
    ]),
    AuditLog.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]),
    AuditLog.aggregate([
      ...basePipeline,
      { $match: { user: { $ne: null } } },
      { $group: { _id: "$user", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          total: 1,
          name: "$userData.name",
          email: "$userData.email"
        }
      }
    ])
  ]);

  const [currentPeriodAgg, previousPeriodAgg] = await Promise.all([
    AuditLog.aggregate([
      ...buildAggregationPipeline({
        entity,
        action,
        user,
        from: currentStart.toISOString(),
        to: currentEnd.toISOString(),
        q
      }),
      { $count: "count" }
    ]),
    AuditLog.aggregate([
      ...buildAggregationPipeline({
        entity,
        action,
        user,
        from: previousStart.toISOString(),
        to: previousEnd.toISOString(),
        q
      }),
      { $count: "count" }
    ])
  ]);

  const currentPeriodTotal = currentPeriodAgg[0]?.count || 0;
  const previousPeriodTotal = previousPeriodAgg[0]?.count || 0;
  const delta = currentPeriodTotal - previousPeriodTotal;
  const deltaPct =
    previousPeriodTotal === 0 ? (currentPeriodTotal > 0 ? 100 : 0) : Number(((delta / previousPeriodTotal) * 100).toFixed(2));

  const anomalySignals = buildAnomalySignals({
    topActions,
    topEntities,
    currentPeriodTotal,
    previousPeriodTotal,
    deltaPct
  });

  res.json({
    totalLogs: totalLogsAgg[0]?.count || 0,
    topActions: topActions.map((item) => ({ action: item._id, total: item.total })),
    topEntities: topEntities.map((item) => ({ entity: item._id, total: item.total })),
    dailyActivity: dailyActivity.map((item) => ({ date: item._id, total: item.total })),
    topUsers,
    comparison: {
      currentPeriod: {
        from: currentStart.toISOString(),
        to: currentEnd.toISOString(),
        total: currentPeriodTotal
      },
      previousPeriod: {
        from: previousStart.toISOString(),
        to: previousEnd.toISOString(),
        total: previousPeriodTotal
      },
      delta,
      deltaPct
    },
    anomalies: anomalySignals
  });
});

export const listAnomalyAcknowledgements = asyncHandler(async (req, res) => {
  const { user, from, to, signature, page = 1, limit = 20 } = req.query;
  const filter = buildAckFilter({ user, from, to, signature });

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AnomalyAcknowledgement.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AnomalyAcknowledgement.countDocuments(filter)
  ]);

  res.json({
    items: items.map((item) => ({
      _id: item._id,
      signature: item.signature,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      user: item.user
    })),
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

export const exportAcknowledgementsCsv = asyncHandler(async (req, res) => {
  const { user, from, to, signature } = req.query;
  const filter = buildAckFilter({ user, from, to, signature });
  const items = await AnomalyAcknowledgement.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).limit(5000);

  const header = ["fecha_reconocimiento", "expira", "firma", "usuario", "email", "rol"].join(",");
  const lines = items.map((item) =>
    [
      csvEscape(new Date(item.createdAt).toISOString()),
      csvEscape(new Date(item.expiresAt).toISOString()),
      csvEscape(item.signature),
      csvEscape(item.user?.name || ""),
      csvEscape(item.user?.email || ""),
      csvEscape(item.user?.role || "")
    ].join(",")
  );
  const csvContent = [header, ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=acknowledgements.csv");
  res.send(csvContent);
});

export const exportAcknowledgementsExcel = asyncHandler(async (req, res) => {
  const { user, from, to, signature } = req.query;
  const filter = buildAckFilter({ user, from, to, signature });
  const items = await AnomalyAcknowledgement.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).limit(5000);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Acknowledgements");
  sheet.addRow(["Fecha reconocimiento", "Expira", "Firma", "Usuario", "Email", "Rol"]);
  for (const item of items) {
    sheet.addRow([
      new Date(item.createdAt).toISOString(),
      new Date(item.expiresAt).toISOString(),
      item.signature,
      item.user?.name || "",
      item.user?.email || "",
      item.user?.role || ""
    ]);
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=acknowledgements.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

const csvEscape = (value) => {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};
