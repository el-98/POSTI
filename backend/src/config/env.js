import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/itcommerce",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : ["http://localhost:3000", "http://localhost:3001"],
  accessSecret: process.env.JWT_ACCESS_SECRET || "access_secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || "30d",
  pointsRate: Number(process.env.POINTS_RATE || 0.05),
  pointsToWalletRate: Number(process.env.POINTS_TO_WALLET_RATE || 0.01),
  auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS || 180),
  ackRetentionHours: Number(process.env.ACK_RETENTION_HOURS || 24),
  nodeEnv: process.env.NODE_ENV || "development",
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL || "admin@posit.local",
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD || "12345678",
  initialAdminName: process.env.INITIAL_ADMIN_NAME || "Administrador"
};
