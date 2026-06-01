import mongoose from 'mongoose'

const PracticeAttemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    clerkUserId: { type: String, required: true, trim: true, index: true },
    startedAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['started', 'submitted', 'abandoned'],
      default: 'started',
      index: true,
    },
    submittedAt: { type: Date },
    abandonedAt: { type: Date },
  },
  { timestamps: true },
)

PracticeAttemptSchema.index({ examId: 1, clerkUserId: 1, startedAt: -1 })
PracticeAttemptSchema.index({ clerkUserId: 1, startedAt: -1 })
PracticeAttemptSchema.index({ examId: 1, clerkUserId: 1, status: 1, startedAt: -1 })

export default mongoose.models.PracticeAttempt ||
  mongoose.model('PracticeAttempt', PracticeAttemptSchema)
