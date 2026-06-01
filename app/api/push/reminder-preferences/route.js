import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { userMutationRateLimit } from '@/lib/rateLimit'
import { validate, reminderPreferenceSchema } from '@/lib/validation'
import ReminderPreference from '@/lib/models/ReminderPreference'

export const runtime = 'nodejs'

const DEFAULT_PREFERENCE = {
  enabled: false,
  reminderTime: '20:00',
  timezone: 'Asia/Dhaka',
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json(DEFAULT_PREFERENCE)

  try {
    await connectDB()
    const preference = await ReminderPreference.findOne({ clerkUserId: userId }).lean()
    return NextResponse.json(preference ? {
      enabled: preference.enabled,
      reminderTime: preference.reminderTime,
      timezone: preference.timezone,
    } : DEFAULT_PREFERENCE)
  } catch (error) {
    logger.error('[GET /api/push/reminder-preferences]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await userMutationRateLimit(request, {
    name: 'reminder-preference-update',
    max: 20,
    keyParts: [userId],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(reminderPreferenceSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const preference = await ReminderPreference.findOneAndUpdate(
      { clerkUserId: userId },
      { $set: parsed.data },
      { upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
    )

    return NextResponse.json({
      enabled: preference.enabled,
      reminderTime: preference.reminderTime,
      timezone: preference.timezone,
    })
  } catch (error) {
    logger.error('[PUT /api/push/reminder-preferences]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
