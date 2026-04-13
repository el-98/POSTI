import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    cost: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    supplier: { type: String, required: true },
    items: { type: [purchaseItemSchema], required: true },
    totalCost: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);
