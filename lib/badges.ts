import type { BadgeType } from "@/models/Badge";

export const BADGE_CONFIG: Record<
  BadgeType,
  { label: string; icon: string; days: number; coins: number }
> = {
  flame: { label: "Ngọn lửa nhỏ", icon: "🔥", days: 1, coins: 10 },
  warrior: { label: "Chiến binh", icon: "⚔️", days: 7, coins: 50 },
  unbreakable: { label: "Bất khuất", icon: "🛡️", days: 30, coins: 200 },
  legend: { label: "Huyền thoại", icon: "👑", days: 100, coins: 500 },
  god: { label: "Thần", icon: "⚡", days: 365, coins: 2000 },
};

export function getBadgesEarned(streak: number): BadgeType[] {
  return (
    Object.entries(BADGE_CONFIG) as [
      BadgeType,
      (typeof BADGE_CONFIG)[BadgeType],
    ][]
  )
    .filter(([, config]) => streak >= config.days)
    .map(([type]) => type);
}

export function calculateStreak(checkinDates: string[]): number {
  if (!checkinDates.length) return 0;

  const sorted = [...checkinDates].sort().reverse();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

  // Nếu hôm nay chưa check-in và ngày cuối không phải hôm qua thì streak = 0
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
