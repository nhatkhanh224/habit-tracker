import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Habit from '@/models/Habit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const habits = await Habit.find({ userId: session.user.id, isArchived: false }).sort({ createdAt: -1 })
  return NextResponse.json(habits)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'Tên habit không được trống' }, { status: 400 })

  await connectDB()
  const habit = await Habit.create({
    userId: session.user.id,
    name,
    description,
    color: color || 'teal',
  })
  return NextResponse.json(habit)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, description, color } = await req.json()
  if (!id || !name) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  await connectDB()
  const habit = await Habit.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { name, description, color },
    { new: true }
  )

  if (!habit) return NextResponse.json({ error: 'Không tìm thấy habit' }, { status: 404 })
  return NextResponse.json(habit)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await connectDB()
  await Habit.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { isArchived: true }
  )
  return NextResponse.json({ message: 'Đã xoá' })
}