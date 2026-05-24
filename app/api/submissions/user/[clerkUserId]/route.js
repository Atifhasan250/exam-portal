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
    const [result] = await Submission.aggregate([
      { $match: { clerkUserId } },
      { $sort: { score: -1, submittedAt: -1, _id: 1 } },
      {
        $group: {
          _id: '$examId',
          submission: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$submission' } },
      { $sort: { score: -1, submittedAt: -1, _id: 1 } },
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: 'exam',
        },
      },
      { $unwind: '$exam' },
      {
        $facet: {
          submissions: [
            { $skip: offset },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                examId: {
                  _id: '$exam._id',
                  title: '$exam.title',
                },
                score: 1,
                total: 1,
                wrong: 1,
                unanswered: 1,
                wasLive: 1,
                attemptCount: { $ifNull: ['$attemptCount', 1] },
                submittedAt: 1,
                lastAttemptAt: { $ifNull: ['$lastAttemptAt', '$submittedAt'] },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ])
    const uniqueSubmissions = result?.submissions || []
    const totalCount = result?.total?.[0]?.count || 0

    return NextResponse.json({
      submissions: uniqueSubmissions,
      totalCount,
      limit,
      offset,
      nextOffset: offset + uniqueSubmissions.length,
      rawFetchedCount: uniqueSubmissions.length,
      returnedCount: uniqueSubmissions.length,
      hasMore: offset + uniqueSubmissions.length < totalCount,
    })
  } catch (error) {
    logger.error('[GET /api/submissions/user/[clerkUserId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
