import mongoose from 'mongoose'

const AdminNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  body: { type: String, required: true, trim: true, maxlength: 240 },
  url: { type: String, default: '/tasks', trim: true, maxlength: 300 },
  scheduledAt: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    index: true,
  },
  sentAt: { type: Date },
  createdBy: { type: String, default: 'admin' },
  eligibleUsers: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
  failureDetails: [{
    clerkUserId: { type: String, default: '' },
    endpointHost: { type: String, default: '' },
    reason: { type: String, default: '', maxlength: 500 },
    deactivated: { type: Boolean, default: false },
  }],
}, { timestamps: true })

AdminNotificationSchema.index({ status: 1, scheduledAt: 1 })

export default mongoose.models.AdminNotification ||
  mongoose.model('AdminNotification', AdminNotificationSchema)
