import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { logAdminAction } from '@/lib/auditLog'
import Resource from '@/lib/models/Resource'
import { isValidObjectId } from '@/lib/routeParams'
import { invalidateResourceCaches } from '@/lib/publicCache'

const MAX_BULK_STATUS = 500

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-resource-bulk-status',
    max: 20,
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const ids = Array.isArray(raw?.ids) ? [...new Set(raw.ids.map((id) => String(id)))] : []
    if (!ids.length) {
      return NextResponse.json({ error: 'Select at least one resource to update' }, { status: 400 })
    }
    if (ids.length > MAX_BULK_STATUS) {
      return NextResponse.json({ error: `You can update at most ${MAX_BULK_STATUS} resources at once` }, { status: 400 })
    }
    if (ids.some((id) => !isValidObjectId(id))) {
      return NextResponse.json({ error: 'One or more resource ids are invalid' }, { status: 400 })
    }
    if (typeof raw?.published !== 'boolean') {
      return NextResponse.json({ error: 'Published status is required' }, { status: 400 })
    }

    await connectDB()
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id))
    const result = await Resource.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          published: raw.published,
          updatedBy: adminCheck.admin?.username || 'admin',
        },
      },
    )

    try {
      await logAdminAction(request, adminCheck.admin, raw.published ? 'BULK_PUBLISH_RESOURCES' : 'BULK_DRAFT_RESOURCES', undefined, {
        matchedCount: result.matchedCount || 0,
        modifiedCount: result.modifiedCount || 0,
        requestedCount: ids.length,
      })
    } catch (error) {
      logger.warn('[POST /api/admin/resources/bulk-status] audit log failed', { error })
    }

    if (result.modifiedCount) {
      try {
        await invalidateResourceCaches()
      } catch (error) {
        logger.warn('[POST /api/admin/resources/bulk-status] cache invalidation failed', { error })
      }
    }

    return NextResponse.json({
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      requestedCount: ids.length,
    })
  } catch (error) {
    logger.error('[POST /api/admin/resources/bulk-status]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
