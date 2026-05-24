import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireUserOrAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'
import '@/lib/models/Exam' // register Exam schema so populate('examId') resolves correctly

export async function GET(request, { params }) {
  try {
    const { clerkUserId } = await params
    const authCheck = await requireUserOrAdmin(clerkUserId)
    if (!authCheck.ok) return authCheck.response
    const { searchParams } = new URL(request.url)
    const rawLimit = Number(searchParams.get('limit'))
    const rawOffset = Number(searchParams.get('offset'))
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 50, 1), 100)
    const offset = Math.max(Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0, 0)

    await connectDB()
    const [submissions, totalCount] = await Promise.all([
      Submission.find({ clerkUserId })
        .populate('examId', 'title')
        .sort({ score: -1, submittedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Submission.countDocuments({ clerkUserId }),
    ])

    const uniqueSubmissions = []
    const seenExams = new Set()

    for (const submission of submissions) {
      const examId = submission.examId?._id?.toString()
      if (examId && !seenExams.has(examId)) {
        seenExams.add(examId)
        uniqueSubmissions.push({
          _id: submission._id,
          examId: submission.examId
            ? {
                _id: submission.examId._id,
                title: submission.examId.title,
              }
            : null,
          score: submission.score,
          total: submission.total,
          wrong: submission.wrong,
          unanswered: submission.unanswered,
          wasLive: submission.wasLive,
          attemptCount: submission.attemptCount || 1,
          submittedAt: submission.submittedAt,
          lastAttemptAt: submission.lastAttemptAt || submission.submittedAt,
        })
      }
    }

    return NextResponse.json({
      submissions: uniqueSubmissions,
      totalCount,
      limit,
      offset,
      nextOffset: offset + submissions.length,
      rawFetchedCount: submissions.length,
      returnedCount: uniqueSubmissions.length,
      hasMore: offset + submissions.length < totalCount,
    })
  } catch (error) {
    logger.error('[GET /api/submissions/user/[clerkUserId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
