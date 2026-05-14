import { NextResponse } from 'next/server'
import { clearAdminCookie } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  await clearAdminCookie()
  return NextResponse.json({ success: true })
}
