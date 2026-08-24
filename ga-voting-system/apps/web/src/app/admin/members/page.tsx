"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { Modal } from "@/components/Modal";

interface Member {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string | null;
  membershipNumberSystem: string;
  membershipNumberReal: string | null;
  votingWeight: string;
  status: string;
  isVotingEligible: boolean;
}

interface ListResponse {
  items: Member[];
  total: number;
  page: number;
  totalPages: number;
}

const emptyForm = { fullName: "", nationalId: "", phone: "", email: "", votingWeight: "1", membershipNumberReal: "" };

export default function MembersPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      const res = await apiFetch<ListResponse>("/api/v1/members", {
        query: { search: search || undefined, status: status || undefined, page },
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل الأعضاء");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/members", {
        method: "POST",
        body: { ...form, votingWeight: Number(form.votingWeight) || 1 },
      });
      toast.push("تم إضافة العضو بنجاح", "success");
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إضافة العضو", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(id: string) {
    if (!confirm("هل تريد تعطيل عضوية هذا العضو؟")) return;
    try {
      await apiFetch(`/api/v1/members/${id}`, { method: "DELETE" });
      toast.push("تم تعطيل العضوية");
      load();
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر تنفيذ العملية", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900">إدارة الأعضاء {data ? `(${data.total})` : ""}</h1>
        <div className="flex gap-2">
          <Link href="/admin/members/import" className="btn-secondary">استيراد من Excel</Link>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ إضافة عضو</button>
        </div>
      </div>

      <div className="card flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="بحث بالاسم، الهوية، الجوال، رقم العضوية..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input max-w-[160px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="ACTIVE">نشط</option>
          <option value="INACTIVE">غير نشط</option>
          <option value="SUSPENDED">موقوف</option>
          <option value="EXPIRED">منتهي</option>
        </select>
      </div>

      {error && <ErrorState message={error} />}
      {!error && !data && <LoadingState />}
      {data && data.items.length === 0 && <EmptyState title="لا يوجد أعضاء مطابقون" />}

      {data && data.items.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">رقم العضوية</th>
                <th className="px-4 py-3 text-right">الجوال</th>
                <th className="px-4 py-3 text-right">وزن التصويت</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{m.membershipNumberSystem}</td>
                  <td className="px-4 py-3 text-gray-600" dir="ltr">{m.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{m.votingWeight}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDisable(m.id)} className="text-xs font-medium text-red-600 hover:underline">
                      تعطيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`h-8 w-8 rounded-lg text-sm ${p === page ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="إضافة عضو جديد" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div><label className="label">الاسم الكامل</label><input required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label className="label">رقم الهوية</label><input required className="input" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} /></div>
            <div><label className="label">رقم الجوال</label><input required className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XXXXXXXX" /></div>
            <div><label className="label">البريد الإلكتروني (اختياري)</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">وزن التصويت</label><input className="input" type="number" min="0.0001" step="0.0001" value={form.votingWeight} onChange={(e) => setForm({ ...form, votingWeight: e.target.value })} /></div>
            <div><label className="label">رقم العضوية الفعلي (اختياري)</label><input className="input" value={form.membershipNumberReal} onChange={(e) => setForm({ ...form, membershipNumberReal: e.target.value })} /></div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? "جارِ الحفظ..." : "حفظ"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
