import mongoose from 'mongoose'

const PushSubscriptionSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  expirationTime: { type: Number, default: null },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
  active: { type: Boolean, default: true, index: true },
  lastSentAt: { type: Date },
  failedAt: { type: Date },
}, { timestamps: true })

PushSubscriptionSchema.index({ clerkUserId: 1, active: 1 })

export default mongoose.models.PushSubscription ||
  mongoose.model('PushSubscription', PushSubscriptionSchema)
