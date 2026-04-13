import cron from "node-cron";
import { AuditLog } from "../models/AuditLog.js";
import { buildAnomalySignals } from "../services/anomalyService.js";
import { emitToUserRoom, getConnectedUserIdsByRole } from "../services/socketService.js";
import { hasUserAcknowledgedAnomaly } from "../services/anomalyAckState.js";

let lastHighRiskSignature = "";

const getWindowTotals = async ({ currentStart, currentEnd, previousStart, previousEnd }) => {
  const [currentAgg, previousAgg] = await Promise.all([
    AuditLog.aggregate([{ $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } }, { $count: "count" }]),
    AuditLog.aggregate([{ $match: { createdAt: { $gte: previousStart, $lte: previousEnd } } }, { $count: "count" }])
  ]);
  return {
    currentPeriodTotal: currentAgg[0]?.count || 0,
    previousPeriodTotal: previousAgg[0]?.count || 0
  };
};

const detectAndEmitAnomalies = async () => {
  const now = new Date();
  const currentEnd = now;
  const currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - 24 * 60 * 60 * 1000);

  const [topActions, topEntities, totals] = await Promise.all([
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
      { $group: { _id: "$action", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 7 }
    ]),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
      { $group: { _id: "$entity", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 7 }
    ]),
    getWindowTotals({ currentStart, currentEnd, previousStart, previousEnd })
  ]);

  const delta = totals.currentPeriodTotal - totals.previousPeriodTotal;
  const deltaPct =
    totals.previousPeriodTotal === 0
      ? totals.currentPeriodTotal > 0
        ? 100
        : 0
      : Number(((delta / totals.previousPeriodTotal) * 100).toFixed(2));

  const anomalies = buildAnomalySignals({
    topActions,
    topEntities,
    currentPeriodTotal: totals.currentPeriodTotal,
    previousPeriodTotal: totals.previousPeriodTotal,
    deltaPct
  });
  const highRisk = anomalies.filter((item) => item.risk === "high");
  const signature = JSON.stringify(highRisk.map((item) => `${item.type}:${item.description}`));

  if (highRisk.length > 0 && signature !== lastHighRiskSignature) {
    const adminUserIds = getConnectedUserIdsByRole("admin");
    for (const userId of adminUserIds) {
      if (!(await hasUserAcknowledgedAnomaly(userId, signature))) {
        emitToUserRoom({
          userId,
          event: "audit:anomaly",
          payload: {
            severity: "high",
            signature,
            detectedAt: new Date().toISOString(),
            message: "Se detectaron anomalías de riesgo alto en auditoría.",
            anomalies: highRisk
          }
        });
      }
    }
    lastHighRiskSignature = signature;
  }

  if (highRisk.length === 0) {
    lastHighRiskSignature = "";
  }
};

export const runAuditAnomalyJob = () => {
  // Revisión cada 5 minutos para notificación proactiva.
  cron.schedule("*/5 * * * *", async () => {
    await detectAndEmitAnomalies();
  });
};
