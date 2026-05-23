import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, reorderItemsSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { invalidateResourceCaches } from '@/lib/publicCache'
import Resource from '@/lib/models/Resource'

export async function PUT(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const raw = await request.json()
    const parsed = validate(reorderItemsSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const resources = await Resource.find(
      { _id: { $in: parsed.data.orderedIds } },
      { _id: 1, categoryId: 1 },
    ).lean()

    if (resources.length !== parsed.data.orderedIds.length) {
      return NextResponse.json({ error: 'One or more resources were not found.' }, { status: 400 })
    }

    const categoryIds = new Set(resources.map((resource) => resource.categoryId.toString()))
    if (parsed.data.categoryId) {
      if (categoryIds.size !== 1 || !categoryIds.has(parsed.data.categoryId)) {
        return NextResponse.json({ error: 'Resources must all belong to the selected category.' }, { status: 400 })
      }
    } else if (categoryIds.size !== 1) {
      return NextResponse.json(
        { error: 'Select a single category before reordering resources.' },
        { status: 400 },
      )
    }

    const categoryId = parsed.data.categoryId || [...categoryIds][0]
    const categoryResourceCount = await Resource.countDocuments({ categoryId })
    if (categoryResourceCount !== parsed.data.orderedIds.length) {
      return NextResponse.json(
        { error: 'Reorder requires the full resource list for one category.' },
        { status: 400 },
      )
    }

    const session = await mongoose.startSession()
    try {
      session.startTransaction()
      const result = await Resource.bulkWrite(parsed.data.orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, categoryId },
          update: { $set: { order: index + 1 } },
        },
      })), { session, ordered: true })

      if (result.matchedCount !== parsed.data.orderedIds.length) {
        throw new Error('RESOURCE_REORDER_SCOPE_CHANGED')
      }

      await session.commitTransaction()
    } catch (txError) {
      if (session.inTransaction()) await session.abortTransaction()
      if (txError.message === 'RESOURCE_REORDER_SCOPE_CHANGED') {
        return NextResponse.json({ error: 'Resource reorder scope changed. Refresh and try again.' }, { status: 409 })
      }
      throw txError
    } finally {
      await session.endSession()
    }

    await logAdminAction(request, adminCheck.admin, 'REORDER_RESOURCES', categoryId, {
      categoryId,
      count: parsed.data.orderedIds.length,
    })
    await invalidateResourceCaches()

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[PUT /api/admin/resources/reorder]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
