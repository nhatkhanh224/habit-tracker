import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CheckIn from "@/models/CheckIn";
import Badge from "@/models/Badge";
import Habit from "@/models/Habit";
import User from "@/models/User";
import { calculateStreak, getBadgesEarned, BADGE_CONFIG } from "@/lib/badges";
import type { BadgeType } from "@/models/Badge";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId, note } = await req.json();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  await connectDB();

  // Kiểm tra đã check-in hôm nay chưa
  const existing = await CheckIn.findOne({ habitId, date: today });
  if (existing)
    return NextResponse.json(
      { error: "Đã check-in hôm nay rồi" },
      { status: 400 },
    );

  // Tạo check-in
  await CheckIn.create({ habitId, userId: session.user.id, date: today, note });

  // Tính streak
  const allCheckins = await CheckIn.find({ habitId }).select("date");
  const dates = allCheckins.map((c) => c.date);
  const streak = calculateStreak(dates);

  // Kiểm tra và trao badge mới
  const earned = getBadgesEarned(streak);
  const newBadges: BadgeType[] = [];

  for (const type of earned) {
    try {
      await Badge.create({ userId: session.user.id, habitId, type });
      newBadges.push(type);
      // Cộng coins vào user
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { coins: BADGE_CONFIG[type].coins },
      });
    } catch {
      // Badge đã tồn tại (unique index) → bỏ qua
    }
  }

  return NextResponse.json({ streak, newBadges });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const habitId = searchParams.get("habitId");
  if (!habitId)
    return NextResponse.json({ error: "Thiếu habitId" }, { status: 400 });

  await connectDB();
  const checkins = await CheckIn.find({ habitId }).sort({ date: -1 }).limit(60);
  return NextResponse.json(checkins);
}
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId, dates } = await req.json();
  // dates: string[] — mảng ngày dạng "2024-04-01"

  await connectDB();

  const results = await Promise.allSettled(
    dates.map((date: string) =>
      CheckIn.create({ habitId, userId: session.user.id, date }),
    ),
  );

  const added = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ added });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { habitId, date } = await req.json();
  await connectDB();
  await CheckIn.deleteOne({ habitId, userId: session.user.id, date });
  return NextResponse.json({ message: "Đã xoá checkin" });
}
