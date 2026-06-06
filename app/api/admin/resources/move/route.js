import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { logAdminAction } from '@/lib/auditLog'
import { invalidateResourceCaches } from '@/lib/publicCache'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import Resource from '@/lib/models/Resource'

export async function PUT(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-resource-move',
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const resourceId = raw.resourceId?.toString()
    const categoryId = raw.categoryId?.toString()
    const targetPosition = Math.trunc(Number(raw.targetPosition))

    if (!isValidObjectId(resourceId)) return invalidIdResponse('resource id')
    if (!isValidObjectId(categoryId)) return invalidIdResponse('category id')
    if (!Number.isFinite(targetPosition) || targetPosition < 1) {
      return NextResponse.json({ error: 'Target position must be 1 or higher.' }, { status: 400 })
    }

    await connectDB()
    let finalPosition = targetPosition
    let resourceCount = 0
    const session = await mongoose.startSession()
    try {
      session.startTransaction()

      const resource = await Resource.findOne({ _id: resourceId, categoryId }, { _id: 1 })
        .session(session)
        .lean()
      if (!resource) {
        await session.abortTransaction()
        return NextResponse.json({ error: 'Resource not found in the selected category.' }, { status: 404 })
      }

      const resources = await Resource.find({ categoryId }, { _id: 1 })
        .sort({ order: 1, createdAt: -1, _id: 1 })
        .session(session)
        .lean()

      resourceCount = resources.length
      finalPosition = Math.min(targetPosition, resourceCount)

      const nextIds = resources
        .map((entry) => entry._id.toString())
        .filter((id) => id !== resourceId)
      nextIds.splice(finalPosition - 1, 0, resourceId)

      const result = await Resource.bulkWrite(nextIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, categoryId },
          update: { $set: { order: index + 1 } },
        },
      })), { session, ordered: true })

      if (result.matchedCount !== nextIds.length) throw new Error('RESOURCE_MOVE_SCOPE_CHANGED')

      await session.commitTransaction()
    } catch (txError) {
      if (session.inTransaction()) await session.abortTransaction()
      if (txError.message === 'RESOURCE_MOVE_SCOPE_CHANGED') {
        return NextResponse.json({ error: 'Resource move scope changed. Refresh and try again.' }, { status: 409 })
      }
      throw txError
    } finally {
      await session.endSession()
    }

    await logAdminAction(request, adminCheck.admin, 'MOVE_RESOURCE', resourceId, {
      categoryId,
      targetPosition: finalPosition,
      count: resourceCount,
    })
    try {
      await invalidateResourceCaches()
    } catch (error) {
      logger.error('[PUT /api/admin/resources/move] cache invalidation failed', { error, categoryId })
    }

    return NextResponse.json({ ok: true, targetPosition: finalPosition })
  } catch (error) {
    logger.error('[PUT /api/admin/resources/move]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
