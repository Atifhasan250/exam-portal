import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Question from '@/lib/models/Question'

export async function PUT(request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { orderedIds } = await request.json()
    await connectDB()
    await Promise.all(
      orderedIds.map((id, index) => Question.findByIdAndUpdate(id, { order: index })),
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
