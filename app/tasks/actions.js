'use server'

import { auth } from '@clerk/nextjs/server'
import { connectDB } from '@/lib/db'
import PlannerData from '@/lib/models/PlannerData'

const defaultHabits = [
  { id: 'habit_1', label: '5 Waqt salah' },
  { id: 'habit_2', label: '1hr coding prac' },
  { id: 'habit_3', label: 'Exercise' },
  { id: 'habit_4', label: 'Learn something new' },
]

const defaultWeeks = [
  {
    week: 1,
    title: 'Week 1',
    tasks: [
      { id: 't1', days: 'Days 1-3', desc: 'Set up your workspace and tools', completed: false },
      { id: 't2', days: 'Days 4-7', desc: 'Create your daily schedule', completed: false },
    ],
  },
  {
    week: 2,
    title: 'Week 2',
    tasks: [
      { id: 't3', days: 'Days 8-10', desc: 'Focus on core habits', completed: false },
      { id: 't4', days: 'Days 11-14', desc: 'Track and adjust your progress', completed: false },
    ],
  },
  {
    week: 3,
    title: 'Week 3',
    tasks: [
      { id: 't5', days: 'Days 15-18', desc: 'Increase focus time blocks', completed: false },
      { id: 't6', days: 'Days 19-21', desc: 'Minimize distractions', completed: false },
    ],
  },
  {
    week: 4,
    title: 'Week 4',
    tasks: [
      { id: 't7', days: 'Days 22-25', desc: 'Maintain your streak', completed: false },
      { id: 't8', days: 'Days 26-28', desc: 'Review and celebrate wins', completed: false },
      { id: 't9', days: 'Days 29-30', desc: 'Plan for the next month', completed: false },
    ],
  },
]

export async function getPlannerData() {
  const { userId } = await auth()
  if (!userId) return null

  await connectDB()

  let planner = await PlannerData.findOne({ clerkUserId: userId }).lean()

  if (!planner) {
    planner = await PlannerData.create({
      clerkUserId: userId,
      habits: defaultHabits,
      habitHistory: {},
      weeks: defaultWeeks,
      tagDismissed: false
    })
    planner = planner.toObject()
  }

  // Sanitize the object to safely pass to client
  return JSON.parse(JSON.stringify(planner))
}

export async function updatePlannerData(data) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await connectDB()

  // Find and update, or create if it somehow doesn't exist
  const planner = await PlannerData.findOneAndUpdate(
    { clerkUserId: userId },
    { $set: data },
    { new: true, upsert: true, lean: true }
  )

  return JSON.parse(JSON.stringify(planner))
}

export async function resetPlannerData() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await connectDB()

  const planner = await PlannerData.findOneAndUpdate(
    { clerkUserId: userId },
    { 
      $set: {
        habits: defaultHabits,
        habitHistory: {},
        weeks: defaultWeeks,
        tagDismissed: false
      } 
    },
    { new: true, lean: true }
  )

  return JSON.parse(JSON.stringify(planner))
}
