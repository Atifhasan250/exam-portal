import mongoose from 'mongoose'

const AdminAuditLogSchema = new mongoose.Schema({
  admin: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String, default: 'unknown' },
  createdAt: { type: Date, default: Date.now, index: true },
})

AdminAuditLogSchema.index({ admin: 1, createdAt: -1 })

export default mongoose.models.AdminAuditLog ||
  mongoose.model('AdminAuditLog', AdminAuditLogSchema)
