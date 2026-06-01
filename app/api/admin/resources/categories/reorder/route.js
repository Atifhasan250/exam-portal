import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, reorderItemsSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { invalidateResourceCaches } from '@/lib/publicCache'
import ResourceCategory from '@/lib/models/ResourceCategory'

export async function PUT(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-resource-category-reorder',
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(reorderItemsSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const matchedCount = await ResourceCategory.countDocuments({ _id: { $in: parsed.data.orderedIds } })
    if (matchedCount !== parsed.data.orderedIds.length) {
      return NextResponse.json({ error: 'One or more categories were not found.' }, { status: 404 })
    }

    const categoryCount = await ResourceCategory.countDocuments({})
    if (categoryCount !== parsed.data.orderedIds.length) {
      return NextResponse.json(
        { error: 'Reorder requires the full category list.' },
        { status: 400 },
      )
    }

    const result = await ResourceCategory.bulkWrite(parsed.data.orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    })), { ordered: true })

    if (result.matchedCount !== parsed.data.orderedIds.length) {
      return NextResponse.json({ error: 'Category reorder scope changed. Refresh and try again.' }, { status: 409 })
    }

    await logAdminAction(request, adminCheck.admin, 'REORDER_RESOURCE_CATEGORIES', undefined, {
      count: parsed.data.orderedIds.length,
    })
    await invalidateResourceCaches()

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[PUT /api/admin/resources/categories/reorder]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
