import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, imageKitAssetSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import UploadedAsset from '@/lib/models/UploadedAsset'
import { serialize } from '@/lib/resourceUtils'

export async function GET(request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const fileHash = searchParams.get('fileHash')?.trim().toLowerCase()
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const rawLimit = !limitParam?.trim() ? NaN : Number(limitParam)
    const rawOffset = !offsetParam?.trim() ? NaN : Number(offsetParam)
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 50, 1), 100)
    const offset = Math.max(Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0, 0)
    const query = fileHash ? { fileHash } : {}
    const assets = await UploadedAsset.find(query)
      .sort({ createdAt: -1 })
      .skip(fileHash ? 0 : offset)
      .limit(fileHash ? 1 : limit)
      .lean()

    if (fileHash) return NextResponse.json(serialize(assets[0] || null))

    const totalCount = await UploadedAsset.countDocuments(query)
    return NextResponse.json({
      assets: serialize(assets),
      totalCount,
      limit,
      offset,
      hasMore: offset + assets.length < totalCount,
    })
  } catch (error) {
    logger.error('[GET /api/admin/assets]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-asset-register',
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(imageKitAssetSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const asset = await UploadedAsset.findOneAndUpdate(
      { fileHash: parsed.data.fileHash },
      {
        $setOnInsert: {
          ...parsed.data,
          uploadedBy: adminCheck.admin?.username || 'admin',
        },
      },
      { new: true, upsert: true, lean: true },
    )

    await logAdminAction(request, adminCheck.admin, 'REGISTER_ASSET', asset._id, {
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      folder: asset.folder,
    })

    return NextResponse.json(serialize(asset), { status: 201 })
  } catch (error) {
    logger.error('[POST /api/admin/assets]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
