import mongoose from 'mongoose'

const ExamAttemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    clerkUserId: { type: String, required: true, trim: true, index: true },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired'],
      default: 'in_progress',
      index: true,
    },
    questionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one question is required',
      },
    },
    answers: { type: Map, of: Number, default: {} },
    integrityEvents: [
      {
        type: { type: String, trim: true, maxlength: 80 },
        occurredAt: { type: Date, default: Date.now },
      },
    ],
    submittedAt: { type: Date },
  },
  { timestamps: true },
)

ExamAttemptSchema.index({ examId: 1, clerkUserId: 1 }, { unique: true })
ExamAttemptSchema.index({ clerkUserId: 1, status: 1, updatedAt: -1 })

export default mongoose.models.ExamAttempt ||
  mongoose.model('ExamAttempt', ExamAttemptSchema)
