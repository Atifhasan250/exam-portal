import mongoose from 'mongoose'

const ReminderPreferenceSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false, index: true },
  reminderTime: { type: String, default: '20:00' },
  timezone: { type: String, default: 'Asia/Dhaka' },
}, { timestamps: true })

ReminderPreferenceSchema.index({ enabled: 1, reminderTime: 1, timezone: 1 })

export default mongoose.models.ReminderPreference ||
  mongoose.model('ReminderPreference', ReminderPreferenceSchema)
