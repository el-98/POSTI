import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    metadata: mongoose.Schema.Types.Mixed,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    diff: [mongoose.Schema.Types.Mixed]
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ entity: "text", action: "text", entityId: "text" });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
