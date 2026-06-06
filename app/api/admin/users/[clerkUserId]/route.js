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
  getLocalDateString,
} from '@/lib/analytics'
import ResourceProgress from '@/lib/models/ResourceProgress'
import Exam from '@/lib/models/Exam'
import '@/lib/models/Resource'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
}

export async function GET(request, { params }) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.ok) return authCheck.response

    const { clerkUserId } = await params
    const { searchParams } = new URL(request.url)
    const rawExamLimit = Number(searchParams.get('examLimit'))
    const rawExamOffset = Number(searchParams.get('examOffset'))
    const examLimit = Math.min(Math.max(Number.isFinite(rawExamLimit) ? Math.trunc(rawExamLimit) : 50, 1), 100)
    const examOffset = Math.max(Number.isFinite(rawExamOffset) ? Math.trunc(rawExamOffset) : 0, 0)
    const includeSummary = searchParams.get('includeSummary') !== '0'

    await connectDB()

    const [submissions, examTotalCount] = await Promise.all([
      Submission.find({ clerkUserId })
        .populate('examId', 'title duration')
        .sort({ submittedAt: -1 })
        .skip(examOffset)
        .limit(examLimit)
        .lean(),
      Submission.countDocuments({ clerkUserId }),
    ])

    const liveExamIds = submissions
      .filter((sub) => sub.wasLive && sub.examId)
      .map((sub) => sub.examId._id)
    const liveRankMap = await getLiveSubmissionRankMap(liveExamIds)

    const examHistory = []
    for (const sub of submissions) {
      examHistory.push({
        submissionId: sub._id,
        examId: sub.examId?._id || sub.examId || null,
        examTitle: sub.examId?.title || sub.examTitleSnapshot || 'Deleted exam',
        score: sub.score,
        totalQuestions: sub.total,
        wasLive: sub.wasLive,
        attemptCount: sub.attemptCount || 1,
        submittedAt: sub.submittedAt,
        lastAttemptAt: sub.lastAttemptAt || sub.submittedAt,
        rank: sub.wasLive ? liveRankMap.get(sub._id.toString()) || null : null,
      })
    }

    if (!includeSummary) {
      return NextResponse.json({
        exams: examHistory,
        examsPage: {
          totalCount: examTotalCount,
          limit: examLimit,
          offset: examOffset,
          hasMore: examOffset + submissions.length < examTotalCount,
        },
      }, { headers: noStoreHeaders })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)
    const category = getProfileCategory(user.publicMetadata)

    const basicInfo = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      imageUrl: user.publicMetadata?.profileImageUrl || user.imageUrl,
      createdAt: user.createdAt,
      emailAddress: user.emailAddresses?.[0]?.emailAddress || '',
      category,
    }

    const now = new Date()
    const [planner, resourceProgress, summarySubmissions, nextExam] = await Promise.all([
      PlannerData.findOne({ clerkUserId }, { habits: 1, habitHistory: 1, weeks: 1 }).lean(),
      ResourceProgress.find({ clerkUserId })
        .populate('resourceId', 'title slug type thumbnailUrl youtubeId durationSeconds')
        .sort({ lastAccessedAt: -1 })
        .limit(20)
        .lean(),
      Submission.find({ clerkUserId })
        .populate('examId', 'title liveStart liveEnd')
        .sort({ submittedAt: -1 })
        .limit(50)
        .lean(),
      Exam.findOne({ published: true, liveStart: { $gt: now } }, { title: 1, liveStart: 1, liveEnd: 1, updatedAt: 1 })
        .sort({ liveStart: 1, updatedAt: -1 })
        .lean(),
    ])

    const habits = planner?.habits || []
    const habitHistory = planner?.habitHistory || {}
    const weeks = planner?.weeks || []
    const taskStats = getTaskStats(weeks)
    const habitStats = getHabitStats(habits, habitHistory)
    const resourceStats = getResourceStats(resourceProgress)

    const scored = summarySubmissions.filter((item) => Number(item.total) > 0)
    const percentages = scored.map((item) => Math.round((item.score / item.total) * 100))
    const averageScore = percentages.length
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : 0
    const bestScore = percentages.length ? Math.max(...percentages) : 0
    const liveCompleted = summarySubmissions.filter((item) => item.wasLive).length
    const practiceCompleted = summarySubmissions.filter((item) => !item.wasLive).length

    const uniqueExams = []
    const seenExamIds = new Set()
    for (const sub of scored) {
      const eId = sub.examId?._id?.toString() || sub.examId?.toString()
      if (eId && !seenExamIds.has(eId)) {
        seenExamIds.add(eId)
        uniqueExams.push(sub)
      }
    }

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
        total: taskStats.total,
        completed: taskStats.completed,
        progressPercentage: taskStats.percent,
        habitsPercentage: habitStats.percent,
        daysTracked: habitStats.daysTracked,
        analytics
      },
      dashboard: {
        metrics: {
          averageScore,
          bestScore,
          liveCompleted,
          practiceCompleted,
          currentStreak: analytics.currentStreak,
          bestStreak: analytics.bestStreak,
          taskCompletionPercent: taskStats.percent,
          resourcesStarted: resourceStats.started,
          resourcesCompleted: resourceStats.completed,
        },
        scoreTrend: uniqueExams.slice(0, 10).reverse().map((submission) => ({
          id: submission._id.toString(),
          title: submission.examId?.title || submission.examTitleSnapshot || 'Deleted exam',
          percentage: Math.round((submission.score / submission.total) * 100),
          wasLive: Boolean(submission.wasLive),
          submittedAt: submission.submittedAt,
        })),
        recentExams: uniqueExams.slice(0, 5).map((submission) => ({
          id: submission._id.toString(),
          examId: submission.examId?._id?.toString() || submission.examId?.toString() || '',
          title: submission.examId?.title || submission.examTitleSnapshot || 'Deleted exam',
          score: submission.score,
          total: submission.total,
          percentage: Math.round((submission.score / submission.total) * 100),
          wasLive: Boolean(submission.wasLive),
          submittedAt: submission.submittedAt,
        })),
        resources: resourceStats.items,
        heatmap: getHeatmap(habits, habitHistory, weeks, resourceProgress, summarySubmissions),
        continueAction: resourceStats.continueAction || getNextExamAction(nextExam),
        recommendation: getRecommendation({ averageScore, resourceStats, taskStats, nextExam }),
      },
      exams: examHistory,
      examsPage: {
        totalCount: examTotalCount,
        limit: examLimit,
        offset: examOffset,
        hasMore: examOffset + submissions.length < examTotalCount,
      },
    }, { headers: noStoreHeaders })
  } catch (error) {
    logger.error('[GET /api/admin/users/[clerkUserId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500, headers: noStoreHeaders })
  }
}

function getProfileCategory(metadata = {}) {
  if (typeof metadata.category === 'string' && metadata.category.trim()) return metadata.category.trim()
  return Array.isArray(metadata.categories) ? String(metadata.categories[0] || '').trim() : ''
}

function getTaskStats(weeks) {
  let completed = 0
  let total = 0
  weeks.forEach((week) => {
    week.tasks?.forEach((task) => {
      total += 1
      if (task.completed) completed += 1
    })
  })

  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  }
}

function getHabitStats(habits, habitHistory) {
  const days = Object.keys(habitHistory || {})
  const totalHabitsPossible = days.length * habits.length
  let completedHabits = 0

  for (const day of days) {
    const dailyRecord = habitHistory[day] || {}
    for (const val of Object.values(dailyRecord)) {
      if (val) completedHabits += 1
    }
  }

  return {
    daysTracked: days.length,
    percent: totalHabitsPossible ? Math.round((completedHabits / totalHabitsPossible) * 100) : 0,
  }
}

function getHeatmap(habits, habitHistory, weeks, resourceProgress, submissions) {
  const taskDates = new Set()
  weeks.forEach((week) => {
    week.tasks?.forEach((task) => {
      if (task.completed && task.completedDate) taskDates.add(task.completedDate)
    })
  })

  const resourceDates = new Set()
  resourceProgress.forEach((item) => {
    if (item.lastAccessedAt) resourceDates.add(getLocalDateString(new Date(item.lastAccessedAt)))
  })

  const examDates = new Set()
  submissions.forEach((item) => {
    if (item.submittedAt) examDates.add(getLocalDateString(new Date(item.submittedAt)))
  })

  const days = []
  const today = new Date()
  const oldestDate = new Date(today)
  oldestDate.setDate(today.getDate() - 89)
  const paddingDays = oldestDate.getDay()
  for (let i = 0; i < paddingDays; i += 1) days.push(null)

  for (let i = 89; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateKey = getLocalDateString(date)
    const dayHabits = habitHistory[dateKey] || {}
    const completedHabits = Object.values(dayHabits).filter(Boolean).length
    const taskActivity = taskDates.has(dateKey)
    const resourceActivity = resourceDates.has(dateKey)
    const examActivity = examDates.has(dateKey)
    const habitRatio = habits.length ? completedHabits / habits.length : 0

    let intensity = Math.round(habitRatio * 3)
    if (taskActivity) intensity += 1
    if (resourceActivity) intensity += 1
    if (examActivity) intensity += 1

    intensity = Math.min(4, intensity)
    if (intensity === 0 && (completedHabits > 0 || taskActivity || resourceActivity || examActivity)) intensity = 1

    days.push({
      date: dateKey,
      intensity,
      completedHabits,
      taskActivity,
      resourceActivity,
      examActivity,
    })
  }

  return days
}

function getResourceStats(progress) {
  const items = progress
    .filter((item) => item.resourceId)
    .map((item) => {
      const resource = item.resourceId
      const duration = resource.durationSeconds || 0
      const percent = item.completed
        ? 100
        : duration
          ? Math.min(99, Math.round((item.progressSeconds / duration) * 100))
          : item.progressSeconds > 0 ? 25 : 0

      return {
        id: item._id.toString(),
        resourceId: resource._id.toString(),
        title: resource.title,
        type: resource.type,
        thumbnailUrl: resource.thumbnailUrl || (resource.youtubeId ? `https://i.ytimg.com/vi/${resource.youtubeId}/hqdefault.jpg` : ''),
        durationSeconds: duration,
        href: resource.type === 'youtube'
          ? `/resources/watch/${resource.slug || resource._id}`
          : `/resources/view/${resource.slug || resource._id}`,
        percent,
        completed: Boolean(item.completed),
        lastAccessedAt: item.lastAccessedAt,
      }
    })

  const continueAction = items.find((item) => !item.completed) || items[0]

  return {
    started: items.length,
    completed: items.filter((item) => item.completed).length,
    items: items.slice(0, 5),
    continueAction: continueAction
      ? {
          label: continueAction.completed ? 'Review resource' : 'Resume resource',
          href: continueAction.href,
          detail: continueAction.title,
          title: continueAction.title,
          type: continueAction.type,
          thumbnailUrl: continueAction.thumbnailUrl,
          durationSeconds: continueAction.durationSeconds,
          percent: continueAction.percent,
        }
      : null,
  }
}

function getNextExamAction(exam) {
  if (!exam) return { label: 'Browse exams', href: '/exams', detail: 'Find the next practice exam' }
  return {
    label: 'Take next practice exam',
    href: `/exam/${exam._id}`,
    detail: exam.title,
  }
}

function getRecommendation({ averageScore, resourceStats, taskStats, nextExam }) {
  if (averageScore > 0 && averageScore < 60) {
    return 'Recent exam average is below 60%. Reviewing one resource before another practice exam may help.'
  }
  if (resourceStats.started > resourceStats.completed) {
    return 'There is at least one in-progress resource to finish.'
  }
  if (taskStats.total > 0 && taskStats.percent < 70) {
    return 'Planner completion is below 70%, so task follow-through may need attention.'
  }
  if (nextExam) return `${nextExam.title} is the next upcoming published exam.`
  return 'No urgent gap detected from recent dashboard activity.'
}
