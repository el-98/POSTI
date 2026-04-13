import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true },
    deviceId: { type: String, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByToken: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
