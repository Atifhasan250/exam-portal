import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  examId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentName: { type: String, required: true },
  score:       { type: Number, required: true },
  total:       { type: Number, required: true },
  wrong:       { type: Number, required: true },
  unanswered:  { type: Number, required: true },
  answers:     { type: mongoose.Schema.Types.Mixed }, // Object mapping question index to selected option index
  wasLive:     { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
});

SubmissionSchema.index({ examId: 1, wasLive: 1 });
SubmissionSchema.index({ studentName: 1, submittedAt: -1 });
SubmissionSchema.index({ examId: 1, studentName: 1 });

export default mongoose.models?.Submission || mongoose.model('Submission', SubmissionSchema);
