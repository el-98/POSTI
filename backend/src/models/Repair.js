import mongoose from "mongoose";

const repairHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Recibido", "En proceso", "Terminado", "Entregado"],
      required: true
    },
    note: { type: String, default: "" },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const repairSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trackingNumber: { type: String, required: true, unique: true, index: true },
    problemDescription: { type: String, required: true },
    status: {
      type: String,
      enum: ["Recibido", "En proceso", "Terminado", "Entregado"],
      default: "Recibido",
      index: true
    },
    assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: { type: [repairHistorySchema], default: [] },
    dateIn: { type: Date, default: Date.now },
    estimatedDate: Date,
    deliveredDate: Date,
    cost: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Repair = mongoose.model("Repair", repairSchema);
