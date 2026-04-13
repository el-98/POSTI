import { asyncHandler } from "../utils/asyncHandler.js";
import { getSystemSettings, updateSystemSettings } from "../services/settingsService.js";
import { writeAuditLog } from "../services/auditService.js";
import { AuditLog } from "../models/AuditLog.js";
import ExcelJS from "exceljs";

const buildDateRangeFilter = ({ from, to }) => {
  if (!from && !to) return undefined;
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);
  return createdAt;
};

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSettingsHistoryFilter = ({ user, from, to, q, changedField }) => {
  const filter = { entity: "system_settings" };
  if (user) filter.user = user;
  const createdAt = buildDateRangeFilter({ from, to });
  if (createdAt) filter.createdAt = createdAt;
  if (changedField) {
    filter.diff = {
      $elemMatch: {
        path: {
          $regex: escapeRegex(changedField),
          $options: "i"
        }
      }
    };
  }
  if (q) {
    filter.$or = [
      { action: { $regex: q, $options: "i" } },
      { entityId: { $regex: q, $options: "i" } },
      { "metadata.route": { $regex: q, $options: "i" } },
      {
        diff: {
          $elemMatch: {
            path: { $regex: q, $options: "i" }
          }
        }
      }
    ];
  }
  return filter;
};

const csvEscape = (value) => {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};

const formatDateKey = (date) => date.toISOString().slice(0, 10);

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await getSystemSettings();
  res.json(settings);
});

export const putSettings = asyncHandler(async (req, res) => {
  const before = await getSystemSettings();
  const settings = await updateSystemSettings({
    ackRetentionHours: req.body.ackRetentionHours,
    updatedBy: req.user._id
  });
  await writeAuditLog({
    userId: req.user._id,
    action: "update",
    entity: "system_settings",
    entityId: "global",
    metadata: { route: req.originalUrl },
    before,
    after: settings
  });
  res.json(settings);
});

export const getSettingsHistory = asyncHandler(async (req, res) => {
  const { user, from, to, q, changedField, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const baseFilter = buildSettingsHistoryFilter({ user, from, to, q, changedField });
  const [items, total] = await Promise.all([
    AuditLog.find(baseFilter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(baseFilter)
  ]);

  res.json({
    items,
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

export const getSettingsHistorySummary = asyncHandler(async (req, res) => {
  const { user, from, to, q, changedField, windowDays = 7 } = req.query;
  const filter = buildSettingsHistoryFilter({ user, from, to, q, changedField });
  const parsedWindowDays = Number(windowDays);
  const allowedWindowDays = [7, 30];
  const safeWindowDays = allowedWindowDays.includes(parsedWindowDays) ? parsedWindowDays : 7;

  const timelineEnd = to ? new Date(to) : new Date();
  const timelineStart = from
    ? new Date(from)
    : new Date(timelineEnd.getTime() - (safeWindowDays - 1) * 24 * 60 * 60 * 1000);

  const timelineFilter = {
    ...filter,
    createdAt: {
      $gte: timelineStart,
      $lte: timelineEnd
    }
  };

  const [totalChanges, lastChange, topUsers, dailyActivityAgg] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.findOne(filter).populate("user", "name email role").sort({ createdAt: -1 }),
    AuditLog.aggregate([
      { $match: filter },
      { $match: { user: { $ne: null } } },
      { $group: { _id: "$user", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
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
          _id: "$userData._id",
          total: 1,
          name: "$userData.name",
          email: "$userData.email",
          role: "$userData.role"
        }
      }
    ]),
    AuditLog.aggregate([
      { $match: timelineFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const totalsByDay = new Map(dailyActivityAgg.map((item) => [item._id, item.total]));
  const dailyActivity = [];
  const cursor = new Date(timelineStart);
  while (cursor <= timelineEnd) {
    const key = formatDateKey(cursor);
    dailyActivity.push({ date: key, total: totalsByDay.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  res.json({
    totalChanges,
    lastChange: lastChange
      ? {
          _id: lastChange._id,
          createdAt: lastChange.createdAt,
          action: lastChange.action,
          user: lastChange.user
        }
      : null,
    topUser: topUsers[0] || null,
    dailyActivity,
    windowDays: safeWindowDays
  });
});

export const exportSettingsHistoryCsv = asyncHandler(async (req, res) => {
  const { user, from, to, q, changedField } = req.query;
  const filter = buildSettingsHistoryFilter({ user, from, to, q, changedField });
  const logs = await AuditLog.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).limit(5000);

  const header = ["fecha", "usuario", "email", "rol", "antes", "despues", "diff"].join(",");
  const lines = logs.map((log) =>
    [
      csvEscape(new Date(log.createdAt).toISOString()),
      csvEscape(log.user?.name || "sistema"),
      csvEscape(log.user?.email || ""),
      csvEscape(log.user?.role || ""),
      csvEscape(JSON.stringify(log.before || {})),
      csvEscape(JSON.stringify(log.after || {})),
      csvEscape(JSON.stringify(log.diff || []))
    ].join(",")
  );
  const csvContent = [header, ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=settings-history.csv");
  res.send(csvContent);
});

export const exportSettingsHistoryExcel = asyncHandler(async (req, res) => {
  const { user, from, to, q, changedField } = req.query;
  const filter = buildSettingsHistoryFilter({ user, from, to, q, changedField });
  const logs = await AuditLog.find(filter).populate("user", "name email role").sort({ createdAt: -1 }).limit(5000);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("SettingsHistory");
  sheet.addRow(["Fecha", "Usuario", "Email", "Rol", "Antes", "Despues", "Diff"]);
  for (const log of logs) {
    sheet.addRow([
      new Date(log.createdAt).toISOString(),
      log.user?.name || "sistema",
      log.user?.email || "",
      log.user?.role || "",
      JSON.stringify(log.before || {}),
      JSON.stringify(log.after || {}),
      JSON.stringify(log.diff || [])
    ]);
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=settings-history.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});
