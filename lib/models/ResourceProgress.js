import mongoose from 'mongoose'

const ResourceProgressSchema = new mongoose.Schema(
  {
    clerkUserId: { type: String, required: true, trim: true, index: true },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    progressSeconds: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false, index: true },
    lastAccessedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
)

ResourceProgressSchema.index({ clerkUserId: 1, resourceId: 1 }, { unique: true })
ResourceProgressSchema.index({ clerkUserId: 1, completed: 1, lastAccessedAt: -1 })

export default mongoose.models.ResourceProgress ||
  mongoose.model('ResourceProgress', ResourceProgressSchema)
