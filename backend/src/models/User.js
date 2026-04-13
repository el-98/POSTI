import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "vendedor", "cliente"], default: "cliente", index: true },
    /** Solo para role "cliente": frecuente = cliente habitual, ocasional = venta sin cuenta recurrente */
    accountType: { type: String, enum: ["frecuente", "ocasional"], default: "ocasional", index: true },
    walletBalance: { type: Number, default: 0 },
    pointsAccumulated: { type: Number, default: 0 },
    lastPointsConversionAt: { type: Date },
    clientCode: { type: String, trim: true, uppercase: true, sparse: true, index: true },
    pinHash: { type: String }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
