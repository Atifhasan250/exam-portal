import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { validate, attemptEventSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import ExamAttempt from '@/lib/models/ExamAttempt'

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  try {
    const { id, attemptId } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')
    if (!isValidObjectId(attemptId)) return invalidIdResponse('attempt id')

    const { userId } = await getClerkSession()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await rateLimit(request, {
      name: 'attempt-events',
      windowMs: 60 * 1000,
      max: 20,
      keyParts: [userId, id, attemptId],
      message: 'Too many attempt events.',
    })
    if (limited) return limited

    const raw = await request.json()
    const parsed = validate(attemptEventSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const now = new Date()
    const result = await ExamAttempt.updateOne(
      {
        _id: attemptId,
        examId: id,
        clerkUserId: userId,
        status: 'in_progress',
        expiresAt: { $gt: now },
      },
      {
        $push: {
          integrityEvents: {
            $each: [
              {
                type: parsed.data.type,
                occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : now,
              },
            ],
            $slice: -100,
          },
        },
      },
    )

    if (result.matchedCount === 0) {
      await ExamAttempt.updateOne(
        {
          _id: attemptId,
          examId: id,
          clerkUserId: userId,
          status: 'in_progress',
          expiresAt: { $lte: now },
        },
        { $set: { status: 'expired' } },
      )
      return NextResponse.json({ error: 'Active attempt not found or has ended.' }, { status: 403 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[POST /api/exams/[id]/attempts/[attemptId]/events]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
