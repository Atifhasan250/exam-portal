import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { getLiveSubmissionRankMap } from '@/lib/leaderboard'
import PlannerData from '@/lib/models/PlannerData'
import Submission from '@/lib/models/Submission'
import { clerkClient } from '@clerk/nextjs/server'
import {
  getCurrentStreak,
  getBestStreak,
  get7DayAverage,
  getPowerDays,
  getConsistencyScore,
  getTotalActiveDays,
} from '@/lib/analytics'

export async function GET(_request, { params }) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.ok) return authCheck.response

    const { clerkUserId } = await params

    await connectDB()

    // 1. Fetch user data from Clerk
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)

    const basicInfo = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      emailAddress: user.emailAddresses?.[0]?.emailAddress || '',
    }

    // 2. Fetch Task and Habit Progress
    const planner = await PlannerData.findOne({ clerkUserId })
    let totalTasks = 0
    let completedTasks = 0
    let daysTracked = 0
    let completedHabits = 0
    let totalHabitsPossible = 0

    if (planner) {
      if (planner.weeks) {
        for (const week of planner.weeks) {
          if (week.tasks) {
            totalTasks += week.tasks.length
            completedTasks += week.tasks.filter(t => t.completed).length
          }
        }
      }

      if (planner.habitHistory && planner.habits) {
        const days = Object.keys(planner.habitHistory)
        daysTracked = days.length
        totalHabitsPossible = daysTracked * planner.habits.length
        
        for (const day of days) {
          const dailyRecord = planner.habitHistory[day] || {}
          for (const val of Object.values(dailyRecord)) {
            if (val) completedHabits++
          }
        }
      }
    }

    // 3. Fetch Exam History
    const submissions = await Submission.find({ clerkUserId })
      .populate('examId', 'title duration')
      .sort({ submittedAt: -1 })
      .lean()

    const liveExamIds = submissions
      .filter((sub) => sub.wasLive && sub.examId)
      .map((sub) => sub.examId._id)
    const liveRankMap = await getLiveSubmissionRankMap(liveExamIds)

    const examHistory = []
    for (const sub of submissions) {
      if (!sub.examId) continue // Skip if exam was completely deleted

      examHistory.push({
        submissionId: sub._id,
        examId: sub.examId._id,
        examTitle: sub.examId.title,
        score: sub.score,
        totalQuestions: sub.total,
        wasLive: sub.wasLive,
        attemptCount: sub.attemptCount || 1,
        submittedAt: sub.submittedAt,
        lastAttemptAt: sub.lastAttemptAt || sub.submittedAt,
        rank: sub.wasLive ? liveRankMap.get(sub._id.toString()) || null : null,
      })
    }

    // Calculate extended analytics
    const habits = planner?.habits || []
    const habitHistory = planner?.habitHistory || {}
    const weeks = planner?.weeks || []

    const analytics = {
      currentStreak: getCurrentStreak(habits, habitHistory),
      bestStreak: getBestStreak(habits, habitHistory),
      powerDays: getPowerDays(habits, habitHistory, weeks).length,
      sevenDayAvg: get7DayAverage(habits, habitHistory),
      consistency: getConsistencyScore(habitHistory, weeks),
      activeDays: getTotalActiveDays(habitHistory, weeks),
    }

    return NextResponse.json({
      user: basicInfo,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        habitsPercentage: totalHabitsPossible > 0 ? Math.round((completedHabits / totalHabitsPossible) * 100) : 0,
        daysTracked,
        analytics
      },
      exams: examHistory
    })
  } catch (error) {
    logger.error('[GET /api/admin/users/[clerkUserId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
