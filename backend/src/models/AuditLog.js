const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    adminName: { type: String, required: true },
    adminRole: { type: String, required: true }, // 'admin' or 'sub_admin'
    adminType: { type: String, default: null },   // e.g. 'driver_management'
    action: { type: String, required: true },      // e.g. 'CREATE_SUB_ADMIN', 'APPROVE_DRIVER'
    module: { type: String, required: true },      // e.g. 'sub_admin', 'driver', 'payment'
    targetId: { type: String, default: null },     // affected record ID
    targetName: { type: String, default: null },   // human-readable target
    details: { type: String, default: null },      // optional extra context (NO passwords/tokens)
    result: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success'
    },
    ipAddress: { type: String, default: null }
  },
  {
    timestamps: true
  }
);

// Indexes for fast querying
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
