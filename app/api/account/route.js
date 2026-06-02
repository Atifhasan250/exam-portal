import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { userMutationRateLimit } from '@/lib/rateLimit'
import PlannerData from '@/lib/models/PlannerData'
import Submission from '@/lib/models/Submission'
import ResourceProgress from '@/lib/models/ResourceProgress'
import ExamAttempt from '@/lib/models/ExamAttempt'
import PracticeAttempt from '@/lib/models/PracticeAttempt'
import PushSubscription from '@/lib/models/PushSubscription'

export async function DELETE(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await userMutationRateLimit(request, {
      name: 'account-delete',
      windowMs: 15 * 60 * 1000,
      max: 3,
      keyParts: [userId],
      message: 'Too many account deletion attempts. Try again later.',
      requirePersistent: true,
    })
    if (limited) return limited

    await connectDB()

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await Submission.deleteMany({ clerkUserId: userId }).session(session)
        await PlannerData.deleteOne({ clerkUserId: userId }).session(session)
        await ResourceProgress.deleteMany({ clerkUserId: userId }).session(session)
        await ExamAttempt.deleteMany({ clerkUserId: userId }).session(session)
        await PracticeAttempt.deleteMany({ clerkUserId: userId }).session(session)
        await PushSubscription.deleteMany({ clerkUserId: userId }).session(session)
      })
    } finally {
      await session.endSession()
    }

    const client = await clerkClient()
    await client.users.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[DELETE /api/account]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
