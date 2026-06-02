import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { logAdminAction } from '@/lib/auditLog'
import Resource from '@/lib/models/Resource'
import ResourceProgress from '@/lib/models/ResourceProgress'
import UploadedAsset from '@/lib/models/UploadedAsset'
import { isValidObjectId } from '@/lib/routeParams'
import { invalidateResourceCaches } from '@/lib/publicCache'

const MAX_BULK_DELETE = 200

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-resource-bulk-delete',
    max: 10,
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const ids = Array.isArray(raw?.ids) ? [...new Set(raw.ids.map((id) => String(id)))] : []
    if (!ids.length) {
      return NextResponse.json({ error: 'Select at least one resource to delete' }, { status: 400 })
    }
    if (ids.length > MAX_BULK_DELETE) {
      return NextResponse.json({ error: `You can delete at most ${MAX_BULK_DELETE} resources at once` }, { status: 400 })
    }
    if (ids.some((id) => !isValidObjectId(id))) {
      return NextResponse.json({ error: 'One or more resource ids are invalid' }, { status: 400 })
    }

    await connectDB()
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id))
    let deletedCount = 0
    let missingCount = 0

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const resources = await Resource.find({ _id: { $in: objectIds } }, { _id: 1, assetId: 1 })
          .session(session)
          .lean()
        deletedCount = resources.length
        missingCount = ids.length - deletedCount

        await Resource.deleteMany({ _id: { $in: resources.map((resource) => resource._id) } }).session(session)
        await ResourceProgress.deleteMany({ resourceId: { $in: resources.map((resource) => resource._id) } }).session(session)

        const assetReferenceCounts = resources.reduce((counts, resource) => {
          const assetId = resource.assetId?.toString()
          if (!assetId) return counts
          counts.set(assetId, (counts.get(assetId) || 0) + 1)
          return counts
        }, new Map())

        for (const [assetId, count] of assetReferenceCounts) {
          for (let index = 0; index < count; index += 1) {
            await UploadedAsset.updateOne(
              { _id: assetId, referenceCount: { $gt: 0 } },
              { $inc: { referenceCount: -1 } },
              { session },
            )
          }
        }
      })
    } finally {
      await session.endSession()
    }

    try {
      await logAdminAction(request, adminCheck.admin, 'BULK_DELETE_RESOURCES', null, {
        deletedCount,
        missingCount,
        requestedCount: ids.length,
      })
    } catch (error) {
      logger.warn('[POST /api/admin/resources/bulk-delete] audit log failed', { error })
    }

    if (deletedCount) {
      try {
        await invalidateResourceCaches()
      } catch (error) {
        logger.warn('[POST /api/admin/resources/bulk-delete] cache invalidation failed', { error })
      }
    }

    return NextResponse.json({ deletedCount, missingCount, requestedCount: ids.length })
  } catch (error) {
    logger.error('[POST /api/admin/resources/bulk-delete]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
