import { createServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { runMonthlyConversionJob } from "./jobs/monthlyConversionJob.js";
import { runAuditRetentionJob } from "./jobs/auditRetentionJob.js";
import { runAuditAnomalyJob } from "./jobs/auditAnomalyJob.js";
import { setSocketIO, registerSocketUser, unregisterSocketUser } from "./services/socketService.js";
import { acknowledgeAnomalyForUser } from "./services/anomalyAckState.js";
import { ensureSingleAdmin } from "./services/ensureSingleAdmin.js";

const start = async () => {
  await connectDB();
  try {
    await ensureSingleAdmin();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error creando administrador inicial:", err.message);
    // eslint-disable-next-line no-console
    console.log("Revisa MongoDB y variables INITIAL_ADMIN_* en .env. El servidor arranca igual.");
  }
  runMonthlyConversionJob();
  runAuditRetentionJob();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin }
  });
  setSocketIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token requerido en socket"));
    try {
      const decoded = jwt.verify(token, env.accessSecret);
      socket.data.userId = String(decoded.id);
      socket.data.role = decoded.role;
      return next();
    } catch {
      return next(new Error("Token inválido en socket"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const role = socket.data.role;
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
    registerSocketUser({ socketId: socket.id, userId, role });

    socket.emit("system", { message: "Canal de notificaciones conectado" });

    socket.on("audit:anomaly:ack", async (payload) => {
      const signature = payload?.signature;
      if (!signature) return;
      await acknowledgeAnomalyForUser(userId, signature);
      socket.emit("audit:anomaly:ack:ok", { signature });
    });

    socket.on("disconnect", () => {
      unregisterSocketUser(socket.id);
    });
  });

  runAuditAnomalyJob();

  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listo en http://localhost:${env.port}`);
  });
};

start();
