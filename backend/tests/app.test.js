import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { User } from "../src/models/User.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("API base", () => {
  it("responde healthcheck", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("registra y autentica usuario", async () => {
    const register = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "12345678",
      role: "admin"
    });
    expect(register.status).toBe(201);

    const login = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "12345678"
    });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTypeOf("string");
    expect(login.body.refreshToken).toBeTypeOf("string");
  });
});
