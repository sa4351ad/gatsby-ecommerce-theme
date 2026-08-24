"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/admin/login", { method: "POST", body: { email, password } });
      toast.push("تم تسجيل الدخول بنجاح", "success");
      router.push("/admin");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "بيانات الدخول غير صحيحة", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-2xl font-bold text-white">إ</div>
          <h1 className="text-xl font-bold text-gray-900">لوحة تحكم الإدارة</h1>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "جارِ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          هل أنت عضو؟ <a href="/login" className="font-medium text-brand-600 hover:underline">الدخول من هنا</a>
        </p>
      </div>
    </div>
  );
}
