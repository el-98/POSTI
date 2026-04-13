import mongoose from "mongoose";

const pointsMovementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["earn", "convert", "manual"], required: true },
    pointsDelta: { type: Number, required: true },
    pointsAfter: { type: Number, required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    note: String
  },
  { timestamps: true }
);

export const PointsMovement = mongoose.model("PointsMovement", pointsMovementSchema);
