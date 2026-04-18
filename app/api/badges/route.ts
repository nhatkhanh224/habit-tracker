import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Badge from '@/models/Badge'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const habitId = searchParams.get('habitId')
  if (!habitId) return NextResponse.json({ error: 'Thiếu habitId' }, { status: 400 })

  await connectDB()
  const badges = await Badge.find({ habitId, userId: session.user.id })
  return NextResponse.json(badges)
}