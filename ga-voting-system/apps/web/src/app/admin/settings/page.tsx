"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { LoadingState } from "@/components/States";

type Tab = "general" | "voting" | "security" | "sms" | "email";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "عام" },
  { key: "voting", label: "التصويت" },
  { key: "security", label: "الأمان" },
  { key: "sms", label: "الرسائل القصيرة" },
  { key: "email", label: "البريد الإلكتروني" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [values, setValues] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTarget, setTestTarget] = useState("");
  const toast = useToast();

  useEffect(() => {
    setValues(null);
    apiFetch<Record<string, any>>(`/api/v1/settings/${tab}`)
      .then(setValues)
      .catch((err) => toast.push(err instanceof ApiClientError ? err.message : "تعذّر تحميل الإعدادات", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/settings/${tab}`, { method: "PUT", body: values });
      toast.push("تم حفظ الإعدادات بنجاح", "success");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testTarget) {
      toast.push(tab === "sms" ? "أدخل رقم جوال للاختبار" : "أدخل بريدًا إلكترونيًا للاختبار", "error");
      return;
    }
    try {
      await apiFetch(`/api/v1/settings/${tab}/test`, { method: "POST", body: { to: testTarget } });
      toast.push("تم إرسال رسالة الاختبار بنجاح", "success");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "فشل إرسال رسالة الاختبار", "error");
    }
  }

  function set(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-lg font-bold text-gray-900">إعدادات النظام</h1>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.key ? "bg-white shadow-sm" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!values ? (
        <LoadingState />
      ) : (
        <div className="card space-y-4">
          {tab === "general" && (
            <>
              <Field label="اسم النظام"><input className="input" value={values.systemName ?? ""} onChange={(e) => set("systemName", e.target.value)} /></Field>
              <Field label="المنطقة الزمنية"><input className="input" value={values.timezone ?? "Asia/Riyadh"} onChange={(e) => set("timezone", e.target.value)} /></Field>
              <Field label="اللغة الافتراضية">
                <select className="input" value={values.defaultLanguage ?? "ar"} onChange={(e) => set("defaultLanguage", e.target.value)}>
                  <option value="ar">العربية</option>
                  <option value="en">English (قريبًا)</option>
                </select>
              </Field>
            </>
          )}

          {tab === "voting" && (
            <>
              <CheckField label="السماح بتغيير التصويت افتراضيًا" checked={values.allowVoteChangeDefault} onChange={(v) => set("allowVoteChangeDefault", v)} />
              <CheckField label="تفعيل التصويت الموزون" checked={values.weightedVotingEnabled} onChange={(v) => set("weightedVotingEnabled", v)} />
              <CheckField label="تفعيل التصويت السري" checked={values.secretVotingEnabled} onChange={(v) => set("secretVotingEnabled", v)} />
            </>
          )}

          {tab === "security" && (
            <>
              <Field label="مدة صلاحية الجلسة (دقيقة)"><input type="number" className="input" value={values.sessionTimeoutMinutes ?? 60} onChange={(e) => set("sessionTimeoutMinutes", Number(e.target.value))} /></Field>
              <Field label="مدة صلاحية OTP (ثانية)"><input type="number" className="input" value={values.otpTtlSeconds ?? 300} onChange={(e) => set("otpTtlSeconds", Number(e.target.value))} /></Field>
              <Field label="الحد الأقصى لمحاولات OTP"><input type="number" className="input" value={values.otpMaxAttempts ?? 5} onChange={(e) => set("otpMaxAttempts", Number(e.target.value))} /></Field>
              <Field label="الحد الأقصى لمحاولات الدخول"><input type="number" className="input" value={values.loginMaxAttempts ?? 8} onChange={(e) => set("loginMaxAttempts", Number(e.target.value))} /></Field>
              <CheckField label="طلب OTP إضافي عند اعتماد التصويت" checked={values.requireOtpOnVoteConfirmation} onChange={(v) => set("requireOtpOnVoteConfirmation", v)} />
            </>
          )}

          {tab === "sms" && (
            <>
              <Field label="مزود الرسائل"><input className="input" value={values.providerName ?? "CONSOLE"} onChange={(e) => set("providerName", e.target.value)} /></Field>
              <Field label="رابط API"><input className="input" value={values.apiUrl ?? ""} onChange={(e) => set("apiUrl", e.target.value)} /></Field>
              <Field label="مفتاح API"><input className="input" value={values.apiKey ?? ""} onChange={(e) => set("apiKey", e.target.value)} /></Field>
              <Field label="اسم المرسل"><input className="input" value={values.senderName ?? ""} onChange={(e) => set("senderName", e.target.value)} /></Field>
              <div className="flex gap-2 border-t pt-3">
                <input className="input" placeholder="رقم جوال للاختبار" value={testTarget} onChange={(e) => setTestTarget(e.target.value)} />
                <button type="button" onClick={handleTest} className="btn-secondary shrink-0">إرسال اختبار</button>
              </div>
            </>
          )}

          {tab === "email" && (
            <>
              <Field label="SMTP Host"><input className="input" value={values.smtpHost ?? ""} onChange={(e) => set("smtpHost", e.target.value)} /></Field>
              <Field label="SMTP Port"><input type="number" className="input" value={values.smtpPort ?? 587} onChange={(e) => set("smtpPort", Number(e.target.value))} /></Field>
              <Field label="اسم المستخدم"><input className="input" value={values.username ?? ""} onChange={(e) => set("username", e.target.value)} /></Field>
              <Field label="كلمة المرور"><input type="password" className="input" value={values.password ?? ""} onChange={(e) => set("password", e.target.value)} /></Field>
              <Field label="اسم المرسل"><input className="input" value={values.fromName ?? ""} onChange={(e) => set("fromName", e.target.value)} /></Field>
              <Field label="بريد المرسل"><input className="input" value={values.fromEmail ?? ""} onChange={(e) => set("fromEmail", e.target.value)} /></Field>
              <div className="flex gap-2 border-t pt-3">
                <input className="input" placeholder="بريد إلكتروني للاختبار" value={testTarget} onChange={(e) => setTestTarget(e.target.value)} />
                <button type="button" onClick={handleTest} className="btn-secondary shrink-0">إرسال اختبار</button>
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">{saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
