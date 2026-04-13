import mongoose from "mongoose";

const permissionConfigSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "vendedor", "cliente"],
      required: true,
      unique: true,
      index: true
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

export const PermissionConfig = mongoose.model("PermissionConfig", permissionConfigSchema);
