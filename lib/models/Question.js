import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  examId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  question:    { type: String, required: true },
  options:     [{ type: String, required: true }],
  correct:     { type: Number, required: true },
  explanation: { type: String, default: '' },
  order:       { type: Number, default: 0 } // Optional, to maintain order
});

export default mongoose.models?.Question || mongoose.model('Question', QuestionSchema);
