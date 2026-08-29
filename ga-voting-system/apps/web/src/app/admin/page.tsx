"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { LoadingState, ErrorState } from "@/components/States";

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  openVotings: number;
  closedVotings: number;
  scheduledVotings: number;
  votedCountOpen: number;
  notVotedCountOpen: number;
  participationRateOpen: number;
  recentAudit: Array<{ id: string; action: string; entity: string; createdAt: string }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardStats>("/api/v1/dashboard")
      .then(setStats)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل الإحصائيات"));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState />;

  const cards = [
    { label: "إجمالي الأعضاء", value: stats.totalMembers, color: "bg-brand-50 text-brand-700" },
    { label: "أعضاء نشطون", value: stats.activeMembers, color: "bg-emerald-50 text-emerald-700" },
    { label: "أعضاء غير نشطين", value: stats.inactiveMembers, color: "bg-gray-100 text-gray-700" },
    { label: "تصويتات مفتوحة", value: stats.openVotings, color: "bg-emerald-50 text-emerald-700" },
    { label: "تصويتات قادمة", value: stats.scheduledVotings, color: "bg-amber-50 text-amber-700" },
    { label: "تصويتات منتهية", value: stats.closedVotings, color: "bg-gray-100 text-gray-700" },
    { label: "صوّتوا (التصويتات المفتوحة)", value: stats.votedCountOpen, color: "bg-brand-50 text-brand-700" },
    { label: "لم يصوّتوا بعد", value: stats.notVotedCountOpen, color: "bg-red-50 text-red-700" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-gray-900">لوحة التحكم</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`mt-2 inline-block rounded-lg px-2 py-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="mb-2 text-sm font-semibold text-gray-700">نسبة المشاركة في التصويتات المفتوحة</p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, stats.participationRateOpen)}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{stats.participationRateOpen.toFixed(1)}%</p>
      </div>

      <div className="card">
        <p className="mb-3 text-sm font-semibold text-gray-700">آخر العمليات</p>
        <ul className="divide-y divide-gray-100 text-sm">
          {stats.recentAudit.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span className="text-gray-700">{a.action} — {a.entity}</span>
              <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString("ar-SA")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
