"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (identifier.trim().length < 3) {
      toast.push("الرجاء إدخال رقم العضوية أو رقم الهوية", "error");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/login/request-otp", { method: "POST", body: { identifier } });
      sessionStorage.setItem("ga_login_identifier", identifier);
      toast.push("تم إرسال رمز التحقق إلى جوالك المسجَّل");
      router.push("/login/otp");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إرسال رمز التحقق", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">ج</div>
          <h1 className="text-xl font-bold text-gray-900">نظام إدارة الجمعية العمومية</h1>
          <p className="mt-1 text-sm text-gray-500">تسجيل دخول الأعضاء</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">رقم العضوية أو رقم الهوية</label>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="مثال: M-000001 أو 1000000001"
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "جارِ الإرسال..." : "إرسال رمز التحقق"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          هل أنت مسؤول في النظام؟{" "}
          <a href="/admin/login" className="font-medium text-brand-600 hover:underline">
            الدخول من هنا
          </a>
        </p>
      </div>
    </div>
  );
}
