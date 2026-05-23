import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'
import { logger } from '@/lib/logger'

export async function GET(request) {
  try {
    const authCheck = await requireAdmin()
    if (!authCheck.ok) return authCheck.response

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    const query = searchParams.get('q')?.trim().slice(0, 100) || undefined

    const client = await clerkClient()
    const response = await client.users.getUserList({ limit, offset, query })
    
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

    return NextResponse.json({
      users: mappedUsers,
      totalCount: response.totalCount ?? mappedUsers.length,
      limit,
      offset,
      hasMore: offset + mappedUsers.length < (response.totalCount ?? offset + mappedUsers.length),
    })
  } catch (error) {
    logger.error('[GET /api/admin/users]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
