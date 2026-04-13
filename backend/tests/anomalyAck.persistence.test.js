import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { acknowledgeAnomalyForUser, hasUserAcknowledgedAnomaly } from "../src/services/anomalyAckState.js";
import { User } from "../src/models/User.js";
import { AnomalyAcknowledgement } from "../src/models/AnomalyAcknowledgement.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Persistencia de ACK de anomalías", () => {
  it("guarda y consulta ACK en MongoDB", async () => {
    const user = await User.create({
      name: "Ack User",
      email: "ack-user@test.com",
      password: "hash",
      role: "admin"
    });

    const signature = "test-signature-001";
    await acknowledgeAnomalyForUser(user._id.toString(), signature);
    const exists = await hasUserAcknowledgedAnomaly(user._id.toString(), signature);
    expect(exists).toBe(true);

    const stored = await AnomalyAcknowledgement.findOne({ user: user._id, signature });
    expect(stored).not.toBeNull();
    expect(stored.expiresAt).toBeInstanceOf(Date);
  });
});
