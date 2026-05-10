import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.ok) return authCheck.response

    const client = await clerkClient()
    const response = await client.users.getUserList({ limit: 100 })
    
    const usersArray = response.data || response

    const mappedUsers = usersArray.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      emailAddress: user.emailAddresses?.[0]?.emailAddress || '',
    }))

    return NextResponse.json(mappedUsers)
  } catch (error) {
    logger.error('[GET /api/admin/users]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
