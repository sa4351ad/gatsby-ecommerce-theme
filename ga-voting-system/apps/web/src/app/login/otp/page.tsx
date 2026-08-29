"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";

export default function OtpPage() {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const saved = sessionStorage.getItem("ga_login_identifier");
    if (!saved) {
      router.replace("/login");
      return;
    }
    setIdentifier(saved);
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || code.length !== 6) {
      toast.push("الرجاء إدخال رمز التحقق المكوّن من 6 أرقام", "error");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/login/verify-otp", { method: "POST", body: { identifier, code } });
      sessionStorage.removeItem("ga_login_identifier");
      toast.push("تم تسجيل الدخول بنجاح", "success");
      router.push("/dashboard");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "رمز التحقق غير صحيح", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!identifier || cooldown > 0) return;
    try {
      await apiFetch("/api/v1/auth/login/request-otp", { method: "POST", body: { identifier } });
      toast.push("تم إعادة إرسال رمز التحقق");
      setCooldown(60);
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إعادة الإرسال", "error");
    }
  }

  if (!identifier) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">أدخل رمز التحقق</h1>
          <p className="mt-1 text-sm text-gray-500">تم إرسال رمز مكوّن من 6 أرقام عبر رسالة نصية</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <input
            className="input text-center text-2xl tracking-[0.5em]"
            dir="ltr"
            maxLength={6}
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "جارِ التحقق..." : "تأكيد"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="w-full text-center text-sm font-medium text-brand-600 disabled:text-gray-400"
          >
            {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : "إعادة إرسال الرمز"}
          </button>
        </form>
      </div>
    </div>
  );
}
