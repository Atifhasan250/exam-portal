import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, createResourceCategorySchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import ResourceCategory from '@/lib/models/ResourceCategory'
import Resource from '@/lib/models/Resource'
import { serialize, slugify } from '@/lib/resourceUtils'
import { invalidateResourceCaches } from '@/lib/publicCache'

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    await connectDB()
    const categories = await ResourceCategory.find({}).sort({ order: 1, name: 1 }).lean()
    const counts = await Resource.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]))

    return NextResponse.json(serialize(categories.map((category) => ({
      ...category,
      resourceCount: countMap.get(category._id.toString()) || 0,
    }))))
  } catch (error) {
    logger.error('[GET /api/admin/resources/categories]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const raw = await request.json()
    const parsed = validate(createResourceCategorySchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const maxOrder = await ResourceCategory.findOne({}, { order: 1 }).sort({ order: -1 }).lean()
    const category = await ResourceCategory.create({
      ...parsed.data,
      slug: parsed.data.slug || slugify(parsed.data.name),
      order: raw.order === undefined ? (maxOrder?.order || 0) + 1 : parsed.data.order,
    })

    await logAdminAction(request, adminCheck.admin, 'CREATE_RESOURCE_CATEGORY', category._id, {
      name: category.name,
      slug: category.slug,
      published: category.published,
    })
    try {
      await invalidateResourceCaches()
    } catch (error) {
      logger.error('[POST /api/admin/resources/categories] cache invalidation failed', { error, categoryId: category._id })
    }

    return NextResponse.json(serialize(category), { status: 201 })
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 })
    }
    logger.error('[POST /api/admin/resources/categories]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
