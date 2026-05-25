import mongoose from 'mongoose'

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    duration: { type: Number, required: true },
    liveStart: { type: Date },
    liveEnd: { type: Date },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
)

ExamSchema.index({ published: 1, liveEnd: -1 })
ExamSchema.index({ published: 1, liveStart: 1, liveEnd: 1 })

export default mongoose.models.Exam || mongoose.model('Exam', ExamSchema)
