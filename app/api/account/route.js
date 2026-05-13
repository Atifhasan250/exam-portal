import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import PlannerData from '@/lib/models/PlannerData'
import Submission from '@/lib/models/Submission'

export async function DELETE() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await Submission.deleteMany({ clerkUserId: userId }).session(session)
        await PlannerData.deleteOne({ clerkUserId: userId }).session(session)
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
