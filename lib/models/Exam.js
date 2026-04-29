import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  question:    { type: String, required: true },
  options:     [{ type: String, required: true }], // 2–5 options
  correct:     { type: Number, required: true },    // 0-indexed
  explanation: { type: String, default: '' }
});

const ExamSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  duration:  { type: Number, required: true }, // minutes
  liveStart: { type: Date },
  liveEnd:   { type: Date },
  published: { type: Boolean, default: false },
  questions: [QuestionSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models?.Exam || mongoose.model('Exam', ExamSchema);
