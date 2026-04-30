import mongoose from 'mongoose';

const ExamSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  duration:  { type: Number, required: true }, // minutes
  liveStart: { type: Date },
  liveEnd:   { type: Date },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models?.Exam || mongoose.model('Exam', ExamSchema);
