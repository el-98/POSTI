import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { Alert } from "../src/models/Alert.js";
import { Product } from "../src/models/Product.js";
import { Repair } from "../src/models/Repair.js";
import { User } from "../src/models/User.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Promise.all([Alert.deleteMany({}), Product.deleteMany({}), Repair.deleteMany({}), User.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Flujos integrados de negocio", () => {
  it("procesa compra y venta actualizando stock y alertas", async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/auth/csrf");
    const csrfToken = csrfResponse.body.csrfToken;

    await agent.post("/api/auth/register").send({
      name: "Admin",
      email: "admin@t.com",
      password: "12345678",
      role: "admin"
    });
    await agent.post("/api/auth/register").send({
      name: "Vendedor",
      email: "seller@t.com",
      password: "12345678",
      role: "vendedor"
    });
    await agent.post("/api/auth/register").send({
      name: "Cliente",
      email: "client@t.com",
      password: "12345678",
      role: "cliente"
    });

    const adminLogin = await agent.post("/api/auth/login").send({
      email: "admin@t.com",
      password: "12345678",
      deviceId: "admin-device"
    });
    const sellerLogin = await agent.post("/api/auth/login").send({
      email: "seller@t.com",
      password: "12345678",
      deviceId: "seller-device"
    });

    const adminToken = adminLogin.body.accessToken;
    const sellerToken = sellerLogin.body.accessToken;
    const client = await User.findOne({ email: "client@t.com" });

    const productCreate = await agent
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-csrf-token", csrfToken)
      .send({
        name: "Modulo Display",
        sku: "MD-001",
        category: "Repuesto",
        purchasePrice: 10,
        salePrice: 25,
        currentStock: 2,
        minStock: 2,
        supplier: "Proveedor X"
      });
    expect(productCreate.status).toBe(201);
    const productId = productCreate.body._id;

    const purchase = await agent
      .post("/api/purchases")
      .set("Authorization", `Bearer ${sellerToken}`)
      .set("x-csrf-token", csrfToken)
      .send({
        supplier: "Proveedor X",
        items: [{ product: productId, quantity: 3, cost: 10 }]
      });
    expect(purchase.status).toBe(201);

    const sale = await agent
      .post("/api/sales")
      .set("Authorization", `Bearer ${sellerToken}`)
      .set("x-csrf-token", csrfToken)
      .send({
        client: client._id.toString(),
        paymentMethod: "efectivo",
        items: [{ product: productId, quantity: 4 }]
      });
    expect(sale.status).toBe(201);

    const product = await Product.findById(productId);
    expect(product.currentStock).toBe(1);
    const alert = await Alert.findOne({ product: productId, alertType: "low_stock", attended: false });
    expect(alert).not.toBeNull();
  });

  it("crea reparación y permite consulta pública por tracking", async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/auth/csrf");
    const csrfToken = csrfResponse.body.csrfToken;

    await agent.post("/api/auth/register").send({
      name: "Vendedor",
      email: "repairseller@t.com",
      password: "12345678",
      role: "vendedor"
    });
    await agent.post("/api/auth/register").send({
      name: "Cliente",
      email: "repairclient@t.com",
      password: "12345678",
      role: "cliente"
    });

    const sellerLogin = await agent.post("/api/auth/login").send({
      email: "repairseller@t.com",
      password: "12345678",
      deviceId: "repair-device"
    });
    const sellerToken = sellerLogin.body.accessToken;
    const client = await User.findOne({ email: "repairclient@t.com" });

    const createRepair = await agent
      .post("/api/repairs")
      .set("Authorization", `Bearer ${sellerToken}`)
      .set("x-csrf-token", csrfToken)
      .send({
        client: client._id.toString(),
        problemDescription: "No enciende",
        cost: 40
      });
    expect(createRepair.status).toBe(201);

    const tracking = createRepair.body.trackingNumber;
    const publicQuery = await agent.get(`/api/public/repair-status/${tracking}`);
    expect(publicQuery.status).toBe(200);
    expect(publicQuery.body.status).toBe("Recibido");
    expect(publicQuery.body.trackingNumber).toBe(tracking);
  });
});
