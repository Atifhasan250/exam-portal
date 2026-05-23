import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, updateResourceCategorySchema } from '@/lib/validation'
import ResourceCategory from '@/lib/models/ResourceCategory'
import Resource from '@/lib/models/Resource'
import { serialize, slugify } from '@/lib/resourceUtils'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'

export async function PUT(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('category id')

    const raw = await request.json()
    const parsed = validate(updateResourceCategorySchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const update = { ...parsed.data }
    if (update.name && !update.slug) update.slug = slugify(update.name)

    const category = await ResourceCategory.findByIdAndUpdate(id, { $set: update }, { new: true, lean: true })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    return NextResponse.json(serialize(category))
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 })
    }
    logger.error('[PUT /api/admin/resources/categories/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('category id')

    await connectDB()

    const resourceCount = await Resource.countDocuments({ categoryId: id })
    if (resourceCount > 0) {
      return NextResponse.json(
        { error: 'Move or delete resources in this category before deleting it.' },
        { status: 409 },
      )
    }

    const category = await ResourceCategory.findByIdAndDelete(id).lean()
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[DELETE /api/admin/resources/categories/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
