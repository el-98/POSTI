import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    alertType: { type: String, required: true },
    attended: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export const Alert = mongoose.model("Alert", alertSchema);
