import mongoose from 'mongoose'

const AiChatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true, maxlength: 8000 },
    billable: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const ResourceAiChatHistorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    userHash: { type: String, required: true, index: true },
    resourceHash: { type: String, required: true, index: true },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    messages: { type: [AiChatMessageSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

ResourceAiChatHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
ResourceAiChatHistorySchema.index({ userHash: 1, resourceHash: 1 })

export default mongoose.models.ResourceAiChatHistory ||
  mongoose.model('ResourceAiChatHistory', ResourceAiChatHistorySchema)
