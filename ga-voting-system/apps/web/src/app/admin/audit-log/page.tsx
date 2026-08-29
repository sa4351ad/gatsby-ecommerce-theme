"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiDownloadUrl, ApiClientError } from "@/lib/apiClient";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";

interface AuditItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { email: string | null; member: { fullName: string } | null } | null;
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");

  useEffect(() => {
    apiFetch<{ items: AuditItem[] }>("/api/v1/audit-log", { query: { action: action || undefined } })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل سجل التدقيق"));
  }, [action]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">سجل التدقيق</h1>
        <a href={apiDownloadUrl("/api/v1/reports/audit-log", { format: "csv" })} className="btn-secondary">تصدير CSV</a>
      </div>

      <input className="input max-w-xs" placeholder="تصفية حسب نوع العملية (مثال: VOTE_CONFIRMED)" value={action} onChange={(e) => setAction(e.target.value)} />

      {error && <ErrorState message={error} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title="لا توجد سجلات مطابقة" />}

      {items && items.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-right">المستخدم</th>
                <th className="px-4 py-3 text-right">العملية</th>
                <th className="px-4 py-3 text-right">الكيان</th>
                <th className="px-4 py-3 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-gray-500">{new Date(a.createdAt).toLocaleString("ar-SA")}</td>
                  <td className="px-4 py-3 text-gray-700">{a.user?.member?.fullName ?? a.user?.email ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.action}</td>
                  <td className="px-4 py-3 text-gray-500">{a.entity}</td>
                  <td className="px-4 py-3 text-gray-400" dir="ltr">{a.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
