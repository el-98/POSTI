import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import authRoutes from "./routes/authRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
import productRoutes from "./routes/productRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import repairRoutes from "./routes/repairRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { csrfProtection, ensureCsrfCookie } from "./middlewares/csrf.js";

export const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(ensureCsrfCookie);
app.use(morgan("dev"));
app.use(mongoSanitize());
app.use(xssClean());
app.use(csrfProtection);

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10
  })
);
app.use(
  "/api/auth/client-access",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { message: "Demasiados intentos. Espera unos minutos." }
  })
);

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/uploads", express.static(uploadsDir));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/users", userRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);
