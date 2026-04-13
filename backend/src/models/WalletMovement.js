import mongoose from "mongoose";

const walletMovementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["conversion", "aplicacion", "manual"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    expiresAt: Date,
    note: String
  },
  { timestamps: true }
);

export const WalletMovement = mongoose.model("WalletMovement", walletMovementSchema);
