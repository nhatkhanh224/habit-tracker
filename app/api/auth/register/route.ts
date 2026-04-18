import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, password: hashedPassword })

    return NextResponse.json({ message: 'Tạo tài khoản thành công', userId: user._id })
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}