import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, reorderItemsSchema } from '@/lib/validation'
import ResourceCategory from '@/lib/models/ResourceCategory'

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
    await Promise.all(parsed.data.orderedIds.map((id, index) => (
      ResourceCategory.updateOne({ _id: id }, { $set: { order: index + 1 } })
    )))

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[PUT /api/admin/resources/categories/reorder]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
