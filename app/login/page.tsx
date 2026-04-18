"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);

    if (isRegister) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Email hoặc mật khẩu không đúng");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <span className="font-semibold text-lg text-gray-900">Kizen</span>
        </div>

        <h1 className="text-xl font-medium text-gray-900 mb-1">
          {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {isRegister
            ? "Bắt đầu theo dõi thói quen của bạn"
            : "Chào mừng quay trở lại"}
        </p>

        <div className="flex flex-col gap-3">
          {isRegister && (
            <input
              type="text"
              placeholder="Tên của bạn"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 transition-colors"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 transition-colors"
          />
        </div>

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading
            ? "Đang xử lý..."
            : isRegister
              ? "Tạo tài khoản"
              : "Đăng nhập"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-teal-600 font-medium hover:underline"
          >
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </button>
        </p>
      </div>
    </div>
  );
}
