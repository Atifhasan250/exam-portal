import mongoose from 'mongoose'

const PlannerDataSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  habits: [
    {
      id: { type: String, required: true },
      label: { type: String, required: true }
    }
  ],
  habitHistory: { type: mongoose.Schema.Types.Mixed, default: {} },
  weeks: [
    {
      week: { type: Number, required: true },
      title: { type: String, required: true },
      tasks: [
        {
          id: { type: String, required: true },
          days: { type: String, required: true },
          desc: { type: String, required: true },
          resource: { type: String },
          completed: { type: Boolean, default: false },
          completedDate: { type: String }
        }
      ]
    }
  ],
  tagDismissed: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.models.PlannerData || mongoose.model('PlannerData', PlannerDataSchema)
