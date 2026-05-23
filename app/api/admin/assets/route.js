import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
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
    const query = fileHash ? { fileHash } : {}
    const assets = await UploadedAsset.find(query).sort({ createdAt: -1 }).limit(fileHash ? 1 : 100).lean()

    return NextResponse.json(fileHash ? serialize(assets[0] || null) : serialize(assets))
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
