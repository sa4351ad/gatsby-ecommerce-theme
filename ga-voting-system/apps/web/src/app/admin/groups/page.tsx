"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { Modal } from "@/components/Modal";

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  _count: { members: number };
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  GENERAL: "أعضاء الجمعية العمومية",
  BOARD: "مجلس الإدارة",
  COMMITTEE: "لجنة",
  BRANCH: "فرع",
  CUSTOM: "مجموعة خاصة",
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "CUSTOM" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      setGroups(await apiFetch<Group[]>("/api/v1/groups"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل المجموعات");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/groups", { method: "POST", body: form });
      toast.push("تم إنشاء المجموعة", "success");
      setShowCreate(false);
      setForm({ name: "", description: "", type: "CUSTOM" });
      load();
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إنشاء المجموعة", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">المجموعات</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ مجموعة جديدة</button>
      </div>

      {error && <ErrorState message={error} />}
      {!error && !groups && <LoadingState />}
      {groups && groups.length === 0 && <EmptyState title="لا توجد مجموعات بعد" />}

      {groups && groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="card">
              <p className="text-xs font-medium text-brand-600">{GROUP_TYPE_LABELS[g.type] ?? g.type}</p>
              <p className="mt-1 font-bold text-gray-900">{g.name}</p>
              {g.description && <p className="mt-1 text-sm text-gray-500">{g.description}</p>}
              <p className="mt-3 text-xs text-gray-400">{g._count.members} عضو</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="مجموعة جديدة" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div><label className="label">اسم المجموعة</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label className="label">النوع</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(GROUP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="label">الوصف (اختياري)</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? "جارِ الحفظ..." : "حفظ"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
