"use client";
import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { BADGE_CONFIG } from "@/lib/badges";
import type { BadgeType } from "@/models/Badge";
import type { Session } from "next-auth";

interface Habit {
  _id: string;
  name: string;
  description?: string;
  color: string;
}

interface CheckIn {
  date: string;
  note?: string;
}

interface BadgeData {
  type: BadgeType;
  unlockedAt: string;
}

interface HabitData {
  habit: Habit;
  checkins: CheckIn[];
  streak: number;
  todayDone: boolean;
  badges: BadgeData[];
}

const COLOR_MAP: Record<string, string> = {
  teal: "bg-teal-100 text-teal-800 border-teal-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
};

const COLORS = ["teal", "purple", "amber", "blue", "pink"];

const COLOR_BG: Record<string, string> = {
  teal: "bg-teal-400",
  purple: "bg-purple-400",
  amber: "bg-amber-400",
  blue: "bg-blue-400",
  pink: "bg-pink-400",
};

function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(checkins: CheckIn[], days = 30) {
  const result = [];
  const todayStr = getTodayStr();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const str = `${year}-${month}-${day}`;
    result.push({
      date: str,
      done: checkins.some((c) => c.date === str),
      isToday: str === todayStr,
    });
  }
  return result;
}

function getTopBadge(badges: BadgeData[]): BadgeType | null {
  const order: BadgeType[] = ["god", "legend", "unbreakable", "warrior", "flame"];
  for (const type of order) {
    if (badges.some((b) => b.type === type)) return type;
  }
  return null;
}

const RANGE_OPTIONS = [
  { value: 30, label: "30 ngày" },
  { value: 60, label: "60 ngày" },
  { value: 90, label: "3 tháng" },
  { value: 180, label: "6 tháng" },
  { value: 365, label: "1 năm" },
];

export default function DashboardClient({ session }: { session: Session }) {
  const [habitsData, setHabitsData] = useState<HabitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", description: "", color: "teal" });
  const [newBadgePopup, setNewBadgePopup] = useState<BadgeType[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<HabitData | null>(null);
  const [activeNav, setActiveNav] = useState<"dashboard" | "badges">("dashboard");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", color: "teal" });
  const [calendarDays, setCalendarDays] = useState(30);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const habitsRes = await fetch("/api/habits");
    const habits: Habit[] = await habitsRes.json();

    const all = await Promise.all(
      habits.map(async (habit) => {
        const [cRes, bRes] = await Promise.all([
          fetch(`/api/checkins?habitId=${habit._id}`),
          fetch(`/api/badges?habitId=${habit._id}`),
        ]);
        const checkins: CheckIn[] = await cRes.json();
        const badges: BadgeData[] = await bRes.json();
        const today = getTodayStr();
        const todayDone = checkins.some((c) => c.date === today);

        const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
        let streak = 0;
        if (sorted.length) {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
          if (sorted[0].date === today || sorted[0].date === yesterday) {
            streak = 1;
            for (let i = 1; i < sorted.length; i++) {
              const prev = new Date(sorted[i - 1].date);
              const curr = new Date(sorted[i].date);
              if ((prev.getTime() - curr.getTime()) / 86400000 === 1) streak++;
              else break;
            }
          }
        }

        return { habit, checkins, streak, todayDone, badges };
      }),
    );

    setHabitsData(all);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCheckIn(habitId: string) {
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId }),
    });
    const data = await res.json();
    if (data.newBadges?.length) setNewBadgePopup(data.newBadges);
    fetchAll();
  }

  async function handleAddHabit() {
    if (!newHabit.name.trim()) return;
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newHabit),
    });
    setNewHabit({ name: "", description: "", color: "teal" });
    setShowAdd(false);
    fetchAll();
  }

  async function handleEditHabit() {
    if (!selectedHabit || !editForm.name.trim()) return;
    await fetch("/api/habits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedHabit.habit._id, ...editForm }),
    });
    setEditMode(false);
    setSelectedHabit((prev) =>
      prev ? { ...prev, habit: { ...prev.habit, ...editForm } } : null,
    );
    fetchAll();
  }

  async function handleDeleteHabit(habitId: string) {
    if (!confirm("Xoá habit này? Toàn bộ lịch sử check-in sẽ vẫn được giữ.")) return;
    await fetch("/api/habits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: habitId }),
    });
    setSelectedHabit(null);
    fetchAll();
  }

  async function handleToggleCheckin(habitId: string, date: string, isDone: boolean) {
    if (isDone) {
      await fetch("/api/checkins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date }),
      });
    } else {
      await fetch("/api/checkins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, dates: [date] }),
      });
    }
    setSelectedHabit((prev) => {
      if (!prev) return null;
      const checkins = isDone
        ? prev.checkins.filter((c) => c.date !== date)
        : [...prev.checkins, { date }];
      return { ...prev, checkins };
    });
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("vi-VN", {
    weekday: "long", day: "numeric", month: "long",
  });
  const totalHabits = habitsData.length;
  const doneTodayCount = habitsData.filter((h) => h.todayDone).length;
  const bestStreak = Math.max(0, ...habitsData.map((h) => h.streak));
  const rate30 = totalHabits
    ? Math.round(
        (habitsData.reduce((acc, h) => {
          const days = getCalendarDays(h.checkins, 30);
          return acc + days.filter((d) => d.done).length;
        }, 0) / (totalHabits * 30)) * 100,
      )
    : 0;

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 px-2 pb-5 border-b border-gray-100 mb-3">
        <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">K</span>
        </div>
        <span className="font-semibold text-gray-900">Kizen</span>
      </div>

      {[
        { key: "dashboard", label: "Dashboard", icon: "▦" },
        { key: "badges", label: "Badges", icon: "★" },
      ].map((item) => (
        <button
          key={item.key}
          onClick={() => { setActiveNav(item.key as "dashboard" | "badges"); setSidebarOpen(false); }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 transition-colors w-full ${
            activeNav === item.key
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className="mt-auto border-t border-gray-100 pt-4 px-2">
        <p className="text-sm font-medium text-gray-900 truncate">{session.user?.name}</p>
        <p className="text-xs text-gray-400 truncate mb-3">{session.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#f8f8f6]">

      {/* Sidebar desktop — ẩn trên mobile/tablet */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-100 flex-col py-5 px-3 fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile/tablet — drawer từ trái */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-56 bg-white flex flex-col py-5 px-3 h-full shadow-xl">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <main className="lg:ml-56 flex-1 p-4 md:p-6">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex flex-col gap-1">
              <span className="block w-5 h-0.5 bg-gray-600" />
              <span className="block w-5 h-0.5 bg-gray-600" />
              <span className="block w-5 h-0.5 bg-gray-600" />
            </div>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">K</span>
            </div>
            <span className="font-semibold text-gray-900">Kizen</span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-teal-500 text-white text-xs px-3 py-1.5 rounded-xl"
          >
            + Thêm
          </button>
        </div>

        {activeNav === "dashboard" && (
          <>
            {/* Top bar — desktop only */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-medium text-gray-900">Hôm nay</h1>
                <p className="text-sm text-gray-400 capitalize">{dateStr}</p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
              >
                + Thêm habit
              </button>
            </div>

            {/* Mobile date */}
            <p className="lg:hidden text-sm text-gray-400 capitalize mb-4">{dateStr}</p>

            {/* Stats — 2 cols trên mobile, 4 cols trên desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Hôm nay", value: `${doneTodayCount}/${totalHabits}`, color: "text-teal-600" },
                { label: "Streak tốt nhất", value: `${bestStreak} ngày`, color: "text-gray-900" },
                { label: "Tỷ lệ 30 ngày", value: `${rate30}%`, color: "text-amber-600" },
                { label: "Habits", value: `${totalHabits}`, color: "text-gray-900" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 md:p-4">
                  <p className={`text-xl md:text-2xl font-medium ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Content — stack trên mobile/tablet, 2 cols trên desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
              {/* Habit list */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                  Habits — {doneTodayCount}/{totalHabits} hoàn thành
                </p>
                {loading ? (
                  <p className="text-sm text-gray-400">Đang tải...</p>
                ) : habitsData.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Chưa có habit nào</p>
                    <button onClick={() => setShowAdd(true)} className="mt-3 text-teal-600 text-sm font-medium hover:underline">
                      Tạo habit đầu tiên →
                    </button>
                  </div>
                ) : (
                  habitsData.map((hd) => {
                    const topBadge = getTopBadge(hd.badges);
                    return (
                      <div
                        key={hd.habit._id}
                        className={`bg-white border rounded-2xl p-4 mb-3 flex items-center gap-3 transition-all ${
                          hd.todayDone ? "border-teal-200" : "border-gray-100"
                        }`}
                      >
                        <button
                          onClick={() => !hd.todayDone && handleCheckIn(hd.habit._id)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            hd.todayDone
                              ? "bg-teal-500 border-teal-500"
                              : "border-gray-300 hover:border-teal-400"
                          }`}
                        >
                          {hd.todayDone && <span className="text-white text-xs">✓</span>}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${hd.todayDone ? "line-through text-gray-400" : "text-gray-900"}`}>
                            {hd.habit.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {hd.streak > 0 ? `🔥 ${hd.streak} ngày liên tiếp` : "Chưa có streak"}
                          </p>
                        </div>

                        {/* Badge — ẩn trên mobile nhỏ */}
                        {topBadge && (
                          <span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full border ${COLOR_MAP[hd.habit.color] || COLOR_MAP.teal}`}>
                            {BADGE_CONFIG[topBadge].icon} {BADGE_CONFIG[topBadge].label}
                          </span>
                        )}

                        <button
                          onClick={() => { setSelectedHabit(hd); setCalendarDays(30); }}
                          className="text-gray-300 hover:text-gray-500 transition-colors text-lg ml-1 flex-shrink-0"
                        >
                          ›
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right column — hiện dưới habit list trên mobile/tablet */}
              <div className="flex flex-col gap-4">
                {habitsData[0] && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <p className="text-xs font-medium text-gray-900 mb-3">
                      {habitsData[0].habit.name} — 30 ngày
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                      {getCalendarDays(habitsData[0].checkins, 30).map((d) => (
                        <div
                          key={d.date}
                          title={d.date}
                          className={`aspect-square rounded flex items-center justify-center text-[9px] ${
                            d.done
                              ? "bg-teal-500 text-white"
                              : d.isToday
                                ? "border border-teal-400 text-gray-600"
                                : "bg-gray-50 text-gray-300"
                          }`}
                        >
                          {new Date(d.date + "T00:00:00").getDate()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {habitsData[0] && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <p className="text-xs font-medium text-gray-900 mb-3">Milestones</p>
                    {(Object.entries(BADGE_CONFIG) as [BadgeType, (typeof BADGE_CONFIG)[BadgeType]][]).map(([type, cfg]) => {
                      const unlocked = habitsData[0].badges.some((b) => b.type === type);
                      const remaining = cfg.days - habitsData[0].streak;
                      return (
                        <div key={type} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${unlocked ? "bg-teal-50" : "bg-gray-50 opacity-40"}`}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900">{cfg.label}</p>
                            <p className="text-[10px] text-gray-400">{cfg.days} ngày</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${unlocked ? "bg-teal-50 text-teal-700" : "bg-gray-50 text-gray-400"}`}>
                            {unlocked ? "Đạt" : remaining > 0 ? `-${remaining}` : "Sắp"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeNav === "badges" && (
          <>
            <h1 className="text-xl font-medium text-gray-900 mb-6">Badges của bạn</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habitsData.map((hd) => (
                <div key={hd.habit._id} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="font-medium text-gray-900 mb-4">{hd.habit.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(BADGE_CONFIG) as [BadgeType, (typeof BADGE_CONFIG)[BadgeType]][]).map(([type, cfg]) => {
                      const unlocked = hd.badges.some((b) => b.type === type);
                      return (
                        <div
                          key={type}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border w-20 transition-all ${
                            unlocked ? "border-teal-200 bg-teal-50" : "border-gray-100 bg-gray-50 opacity-40"
                          }`}
                        >
                          <span className="text-2xl">{cfg.icon}</span>
                          <span className="text-[10px] text-center text-gray-600 leading-tight">{cfg.label}</span>
                          <span className="text-[9px] text-gray-400">{cfg.days}d</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal thêm habit */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-medium text-gray-900 mb-4">Thêm habit mới</h2>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                placeholder="Tên habit"
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 transition-colors"
              />
              <input
                placeholder="Mô tả (tuỳ chọn)"
                value={newHabit.description}
                onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 transition-colors"
              />
              <div>
                <p className="text-xs text-gray-400 mb-2">Màu sắc</p>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewHabit({ ...newHabit, color: c })}
                      className={`w-7 h-7 rounded-full transition-all ${COLOR_BG[c]} ${newHabit.color === c ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleAddHabit}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal habit detail */}
      {selectedHabit && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-xl max-h-[92vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-gray-900">Chi tiết habit</h2>
              <button
                onClick={() => { setSelectedHabit(null); setEditMode(false); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >×</button>
            </div>

            {editMode ? (
              <div className="flex flex-col gap-3 mb-5">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400"
                  placeholder="Tên habit"
                />
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400"
                  placeholder="Mô tả (tuỳ chọn)"
                />
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditForm({ ...editForm, color: c })}
                      className={`w-7 h-7 rounded-full ${COLOR_BG[c]} ${editForm.color === c ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setEditMode(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">Huỷ</button>
                  <button onClick={handleEditHabit} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white rounded-xl py-2 text-sm font-medium">Lưu</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-medium text-gray-900">{selectedHabit.habit.name}</p>
                  {selectedHabit.habit.description && (
                    <p className="text-sm text-gray-400 mt-0.5">{selectedHabit.habit.description}</p>
                  )}
                  <p className="text-sm text-teal-600 mt-1">🔥 Streak: {selectedHabit.streak} ngày</p>
                </div>
                <button
                  onClick={() => {
                    setEditMode(true);
                    setEditForm({
                      name: selectedHabit.habit.name,
                      description: selectedHabit.habit.description || "",
                      color: selectedHabit.habit.color,
                    });
                  }}
                  className="text-xs border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 text-gray-600"
                >
                  Chỉnh sửa
                </button>
              </div>
            )}

            {/* Range selector */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Lịch sử check-in</p>
              <div className="flex gap-1 flex-wrap justify-end">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCalendarDays(opt.value)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      calendarDays === opt.value
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">Click vào ngày để toggle check-in</p>

            <div className="max-h-64 overflow-y-auto pr-1 mb-5">
              <div className="grid grid-cols-7 gap-1 mb-1 sticky top-0 bg-white pb-1">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                  <div key={d} className="text-[9px] text-gray-300 text-center">{d}</div>
                ))}
              </div>
              {(() => {
                const days = getCalendarDays(selectedHabit.checkins, calendarDays);
                const firstDate = new Date(days[0].date + "T00:00:00");
                const offset = (firstDate.getDay() + 6) % 7;
                return (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: offset }).map((_, i) => (
                      <div key={`pad-${i}`} />
                    ))}
                    {days.map((d) => (
                      <button
                        key={d.date}
                        onClick={() => handleToggleCheckin(selectedHabit.habit._id, d.date, d.done)}
                        title={d.date}
                        className={`aspect-square rounded-lg flex items-center justify-center text-[10px] transition-all hover:opacity-80 ${
                          d.done
                            ? "bg-teal-500 text-white"
                            : d.isToday
                              ? "border-2 border-teal-400 text-gray-600"
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                      >
                        {new Date(d.date + "T00:00:00").getDate()}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Badges</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(BADGE_CONFIG) as [BadgeType, (typeof BADGE_CONFIG)[BadgeType]][]).map(([type, cfg]) => {
                const unlocked = selectedHabit.badges.some((b) => b.type === type);
                return (
                  <div
                    key={type}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      unlocked ? "border-teal-200 bg-teal-50 text-teal-800" : "border-gray-100 bg-gray-50 text-gray-300"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleDeleteHabit(selectedHabit.habit._id)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Xoá habit này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge popup */}
      {newBadgePopup.length > 0 && (
        <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2">
          {newBadgePopup.map((type) => (
            <div key={type} className="bg-white border border-teal-200 rounded-2xl p-4 shadow-lg flex items-center gap-3 animate-bounce">
              <span className="text-3xl">{BADGE_CONFIG[type].icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Badge mới!</p>
                <p className="text-xs text-teal-600">{BADGE_CONFIG[type].label}</p>
              </div>
              <button onClick={() => setNewBadgePopup([])} className="text-gray-300 hover:text-gray-500 ml-2">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}