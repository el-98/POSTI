import mongoose from "mongoose";

const anomalyAcknowledgementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    signature: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

anomalyAcknowledgementSchema.index({ user: 1, signature: 1 }, { unique: true });
anomalyAcknowledgementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AnomalyAcknowledgement = mongoose.model("AnomalyAcknowledgement", anomalyAcknowledgementSchema);
