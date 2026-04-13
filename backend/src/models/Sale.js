import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [saleItemSchema], required: true },
    total: { type: Number, required: true },
    walletApplied: { type: Number, default: 0 },
    finalCharged: { type: Number, required: true },
    generatedPoints: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["efectivo", "tarjeta", "transferencia", "monedero", "mixto"], required: true },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cancelled: { type: Boolean, default: false, index: true },
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Sale = mongoose.model("Sale", saleSchema);
