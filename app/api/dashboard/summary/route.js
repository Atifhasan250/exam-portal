import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  getBestStreak,
  getCurrentStreak,
  getLocalDateString,
} from '@/lib/analytics'
import Submission from '@/lib/models/Submission'
import PlannerData from '@/lib/models/PlannerData'
import ResourceProgress from '@/lib/models/ResourceProgress'
import Exam from '@/lib/models/Exam'
import '@/lib/models/Resource'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  }

  try {
    await connectDB()
    const now = new Date()
    const [submissions, planner, resourceProgress, nextExam] = await Promise.all([
      Submission.find({ clerkUserId: userId })
        .populate('examId', 'title liveStart liveEnd')
        .sort({ submittedAt: -1 })
        .limit(50)
        .lean(),
      PlannerData.findOne({ clerkUserId: userId }).lean(),
      ResourceProgress.find({ clerkUserId: userId })
        .populate('resourceId', 'title slug type thumbnailUrl youtubeId durationSeconds')
        .sort({ lastAccessedAt: -1 })
        .limit(20)
        .lean(),
      Exam.findOne({ published: true, liveStart: { $gt: now } }, { title: 1, liveStart: 1, liveEnd: 1, updatedAt: 1 })
        .sort({ liveStart: 1, updatedAt: -1 })
        .lean(),
    ])

      const scored = submissions.filter((item) => Number(item.total) > 0)
    const percentages = scored.map((item) => Math.round((item.score / item.total) * 100))
    const averageScore = percentages.length
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : 0
    const bestScore = percentages.length ? Math.max(...percentages) : 0
    const liveCompleted = submissions.filter((item) => item.wasLive).length
    const practiceCompleted = submissions.filter((item) => !item.wasLive).length

    const habits = planner?.habits || []
    const habitHistory = planner?.habitHistory || {}
    const weeks = planner?.weeks || []
    const taskStats = getTaskStats(weeks)
    const heatmap = getHeatmap(habits, habitHistory, weeks, resourceProgress, submissions)
    const resourceStats = getResourceStats(resourceProgress)

    const uniqueExams = []
    const seenExamIds = new Set()
    for (const sub of scored) {
      const eId = sub.examId?._id?.toString() || sub.examId?.toString()
      if (eId && !seenExamIds.has(eId)) {
        seenExamIds.add(eId)
        uniqueExams.push(sub)
      }
    }

    return NextResponse.json({
      metrics: {
        averageScore,
        bestScore,
        liveCompleted,
        practiceCompleted,
        currentStreak: getCurrentStreak(habits, habitHistory),
        bestStreak: getBestStreak(habits, habitHistory),
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
      heatmap,
      continueAction: resourceStats.continueAction || getNextExamAction(nextExam),
      recommendation: getRecommendation({ averageScore, resourceStats, taskStats, nextExam }),
    }, { headers: noStoreHeaders })
  } catch (error) {
    logger.error('[GET /api/dashboard/summary]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500, headers: noStoreHeaders })
  }
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

function getHeatmap(habits, habitHistory, weeks, resourceProgress, submissions) {
  const taskDates = new Set()
  weeks.forEach((week) => {
    week.tasks?.forEach((task) => {
      if (task.completed && task.completedDate) taskDates.add(task.completedDate)
    })
  })

  const resourceDates = new Set()
  resourceProgress.forEach(item => {
    if (item.lastAccessedAt) {
      resourceDates.add(getLocalDateString(new Date(item.lastAccessedAt)))
    }
  })

  const examDates = new Set()
  submissions.forEach(item => {
    if (item.submittedAt) {
      examDates.add(getLocalDateString(new Date(item.submittedAt)))
    }
  })

  const days = []
  const today = new Date()
  
  const oldestDate = new Date(today)
  oldestDate.setDate(today.getDate() - 89)
  const paddingDays = oldestDate.getDay()
  for (let i = 0; i < paddingDays; i++) {
    days.push(null)
  }

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
    if (intensity === 0 && (completedHabits > 0 || taskActivity || resourceActivity || examActivity)) {
      intensity = 1
    }

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
  if (!exam) return { label: 'Browse exams', href: '/exams', detail: 'Find your next practice exam' }
  return {
    label: 'Take next practice exam',
    href: `/exam/${exam._id}`,
    detail: exam.title,
  }
}

function getRecommendation({ averageScore, resourceStats, taskStats, nextExam }) {
  if (averageScore > 0 && averageScore < 60) {
    return 'Your recent exam average is below 60%. Review one resource, then retake a practice exam.'
  }
  if (resourceStats.started > resourceStats.completed) {
    return 'Finish one in-progress resource before starting a new topic.'
  }
  if (taskStats.total > 0 && taskStats.percent < 70) {
    return 'Open the task planner and complete today\'s highest-priority study task.'
  }
  if (nextExam) return `Try ${nextExam.title} next to keep your practice streak active.`
  return 'Keep your current rhythm: one focused resource session and one short practice exam.'
}
