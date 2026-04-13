import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { AppSetting } from "../src/models/AppSetting.js";
import { User } from "../src/models/User.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), AppSetting.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("RBAC granular", () => {
  it("bloquea acceso a usuarios para vendedor", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Vendedor",
      email: "rbac-seller@test.com",
      password: "12345678",
      role: "vendedor"
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "rbac-seller@test.com",
      password: "12345678",
      deviceId: "rbac-seller-device"
    });

    const usersResponse = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(usersResponse.status).toBe(403);
  });

  it("permite acceso a usuarios para admin", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Admin",
      email: "rbac-admin@test.com",
      password: "12345678",
      role: "admin"
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "rbac-admin@test.com",
      password: "12345678",
      deviceId: "rbac-admin-device"
    });

    const usersResponse = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(usersResponse.status).toBe(200);
    expect(Array.isArray(usersResponse.body)).toBe(true);
  });

  it("solo admin puede gestionar matriz de permisos", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Admin",
      email: "perm-admin@test.com",
      password: "12345678",
      role: "admin"
    });
    await request(app).post("/api/auth/register").send({
      name: "Vendedor",
      email: "perm-seller@test.com",
      password: "12345678",
      role: "vendedor"
    });

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "perm-admin@test.com",
      password: "12345678",
      deviceId: "perm-admin-device"
    });
    const sellerLogin = await request(app).post("/api/auth/login").send({
      email: "perm-seller@test.com",
      password: "12345678",
      deviceId: "perm-seller-device"
    });

    const adminPermissions = await request(app)
      .get("/api/permissions")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminPermissions.status).toBe(200);

    const sellerPermissions = await request(app)
      .get("/api/permissions")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerPermissions.status).toBe(403);
  });

  it("vendedor puede consultar auditoría según política", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Seller Audit",
      email: "audit-seller@test.com",
      password: "12345678",
      role: "vendedor"
    });
    const sellerLogin = await request(app).post("/api/auth/login").send({
      email: "audit-seller@test.com",
      password: "12345678",
      deviceId: "audit-seller-device"
    });

    const auditResponse = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(auditResponse.status).toBe(200);
    expect(Array.isArray(auditResponse.body.items)).toBe(true);

    const summaryResponse = await request(app)
      .get("/api/audit-logs/summary")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body).toHaveProperty("totalLogs");
    expect(Array.isArray(summaryResponse.body.topActions)).toBe(true);
    expect(summaryResponse.body).toHaveProperty("comparison");
    expect(summaryResponse.body.comparison).toHaveProperty("deltaPct");
    expect(Array.isArray(summaryResponse.body.anomalies)).toBe(true);
  });

  it("admin puede exportar auditoría en csv y excel", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Export Admin",
      email: "export-admin@test.com",
      password: "12345678",
      role: "admin"
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "export-admin@test.com",
      password: "12345678",
      deviceId: "export-admin-device"
    });

    const csvResponse = await request(app)
      .get("/api/audit-logs/export/csv?q=create")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers["content-type"]).toContain("text/csv");

    const excelResponse = await request(app)
      .get("/api/audit-logs/export/excel?q=create")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(excelResponse.status).toBe(200);
    expect(excelResponse.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("solo admin puede consultar historial de acknowledgements", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Ack Admin",
      email: "ack-admin@test.com",
      password: "12345678",
      role: "admin"
    });
    await request(app).post("/api/auth/register").send({
      name: "Ack Seller",
      email: "ack-seller@test.com",
      password: "12345678",
      role: "vendedor"
    });

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "ack-admin@test.com",
      password: "12345678",
      deviceId: "ack-admin-device"
    });
    const sellerLogin = await request(app).post("/api/auth/login").send({
      email: "ack-seller@test.com",
      password: "12345678",
      deviceId: "ack-seller-device"
    });

    const adminResponse = await request(app)
      .get("/api/audit-logs/acknowledgements")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminResponse.status).toBe(200);
    expect(Array.isArray(adminResponse.body.items)).toBe(true);

    const adminCsv = await request(app)
      .get("/api/audit-logs/acknowledgements/export/csv?signature=test")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminCsv.status).toBe(200);
    expect(adminCsv.headers["content-type"]).toContain("text/csv");

    const adminExcel = await request(app)
      .get("/api/audit-logs/acknowledgements/export/excel?signature=test")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminExcel.status).toBe(200);
    expect(adminExcel.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const sellerResponse = await request(app)
      .get("/api/audit-logs/acknowledgements")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerResponse.status).toBe(403);

    const sellerCsv = await request(app)
      .get("/api/audit-logs/acknowledgements/export/csv")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerCsv.status).toBe(403);
  });

  it("solo admin puede leer y actualizar settings", async () => {
    const agent = request.agent(app);
    const csrf = await agent.get("/api/auth/csrf");
    const csrfToken = csrf.body.csrfToken;

    await request(app).post("/api/auth/register").send({
      name: "Settings Admin",
      email: "settings-admin@test.com",
      password: "12345678",
      role: "admin"
    });
    await request(app).post("/api/auth/register").send({
      name: "Settings Seller",
      email: "settings-seller@test.com",
      password: "12345678",
      role: "vendedor"
    });

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "settings-admin@test.com",
      password: "12345678",
      deviceId: "settings-admin-device"
    });
    const sellerLogin = await request(app).post("/api/auth/login").send({
      email: "settings-seller@test.com",
      password: "12345678",
      deviceId: "settings-seller-device"
    });

    const adminGet = await request(app)
      .get("/api/settings")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminGet.status).toBe(200);
    expect(adminGet.body).toHaveProperty("ackRetentionHours");

    const adminPut = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
      .set("Cookie", csrf.headers["set-cookie"] || [])
      .set("x-csrf-token", csrfToken)
      .send({ ackRetentionHours: 36 });
    expect(adminPut.status).toBe(200);
    expect(adminPut.body.ackRetentionHours).toBe(36);

    const adminHistory = await request(app)
      .get("/api/settings/history")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistory.status).toBe(200);
    expect(Array.isArray(adminHistory.body.items)).toBe(true);
    expect(adminHistory.body.items.length).toBeGreaterThan(0);
    expect(adminHistory.body.items[0]).toHaveProperty("before");
    expect(adminHistory.body.items[0]).toHaveProperty("after");

    const adminHistoryFiltered = await request(app)
      .get(`/api/settings/history?user=${adminLogin.body.user.id}`)
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistoryFiltered.status).toBe(200);
    expect(Array.isArray(adminHistoryFiltered.body.items)).toBe(true);

    const adminHistoryByField = await request(app)
      .get("/api/settings/history?changedField=ackRetentionHours")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistoryByField.status).toBe(200);
    expect(Array.isArray(adminHistoryByField.body.items)).toBe(true);
    expect(adminHistoryByField.body.items.length).toBeGreaterThan(0);

    const adminHistoryByQuery = await request(app)
      .get("/api/settings/history?q=update")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistoryByQuery.status).toBe(200);
    expect(Array.isArray(adminHistoryByQuery.body.items)).toBe(true);

    const adminHistorySummary = await request(app)
      .get("/api/settings/history/summary?changedField=ackRetentionHours&windowDays=7")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistorySummary.status).toBe(200);
    expect(adminHistorySummary.body).toHaveProperty("totalChanges");
    expect(adminHistorySummary.body).toHaveProperty("lastChange");
    expect(adminHistorySummary.body).toHaveProperty("topUser");
    expect(Array.isArray(adminHistorySummary.body.dailyActivity)).toBe(true);
    expect(adminHistorySummary.body).toHaveProperty("windowDays");

    const adminHistoryCsv = await request(app)
      .get("/api/settings/history/export/csv?changedField=ackRetentionHours")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistoryCsv.status).toBe(200);
    expect(adminHistoryCsv.headers["content-type"]).toContain("text/csv");

    const adminHistoryExcel = await request(app)
      .get("/api/settings/history/export/excel")
      .set("Authorization", `Bearer ${adminLogin.body.accessToken}`);
    expect(adminHistoryExcel.status).toBe(200);
    expect(adminHistoryExcel.headers["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    const sellerGet = await request(app)
      .get("/api/settings")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerGet.status).toBe(403);

    const sellerHistory = await request(app)
      .get("/api/settings/history")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerHistory.status).toBe(403);

    const sellerHistoryCsv = await request(app)
      .get("/api/settings/history/export/csv")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerHistoryCsv.status).toBe(403);

    const sellerHistorySummary = await request(app)
      .get("/api/settings/history/summary")
      .set("Authorization", `Bearer ${sellerLogin.body.accessToken}`);
    expect(sellerHistorySummary.status).toBe(403);
  });
});
