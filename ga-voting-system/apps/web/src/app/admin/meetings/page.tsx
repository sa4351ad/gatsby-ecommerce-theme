"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { Modal } from "@/components/Modal";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  date: string;
  mode: string;
  status: string;
  _count: { invitees: number; votings: number };
}

const MODE_LABELS: Record<string, string> = { IN_PERSON: "حضوري", ONLINE: "إلكتروني", HYBRID: "مختلط" };
const STATUS_LABELS: Record<string, string> = { SCHEDULED: "مجدوَل", ONGOING: "جارٍ", COMPLETED: "منتهٍ", CANCELLED: "ملغى" };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: toLocalInput(now),
    startTime: toLocalInput(now),
    endTime: toLocalInput(new Date(now.getTime() + 2 * 3600 * 1000)),
    location: "",
    mode: "IN_PERSON",
    inviteAllMembers: true,
  });
  const toast = useToast();

  async function load() {
    try {
      setMeetings(await apiFetch<Meeting[]>("/api/v1/meetings"));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل الاجتماعات");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/meetings", {
        method: "POST",
        body: {
          ...form,
          date: new Date(form.date).toISOString(),
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        },
      });
      toast.push("تم إنشاء الاجتماع", "success");
      setShowCreate(false);
      load();
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إنشاء الاجتماع", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">الاجتماعات</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ اجتماع جديد</button>
      </div>

      {error && <ErrorState message={error} />}
      {!error && !meetings && <LoadingState />}
      {meetings && meetings.length === 0 && <EmptyState title="لا توجد اجتماعات بعد" />}

      {meetings && meetings.length > 0 && (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div key={m.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{m.title}</p>
                <p className="text-sm text-gray-500">{new Date(m.date).toLocaleString("ar-SA")} · {MODE_LABELS[m.mode]} · {m._count.invitees} مدعو · {m._count.votings} تصويت مرتبط</p>
              </div>
              <span className="badge bg-gray-100 text-gray-700">{STATUS_LABELS[m.status] ?? m.status}</span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="اجتماع جديد" onClose={() => setShowCreate(false)} wide>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">عنوان الاجتماع</label><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">الوصف</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className="label">التاريخ</label><input type="date" required className="input" value={form.date.slice(0, 10)} onChange={(e) => setForm({ ...form, date: `${e.target.value}T00:00` })} /></div>
            <div>
              <label className="label">النمط</label>
              <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="label">وقت البداية</label><input type="datetime-local" required className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
            <div><label className="label">وقت النهاية</label><input type="datetime-local" required className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">المكان (اختياري)</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.inviteAllMembers} onChange={(e) => setForm({ ...form, inviteAllMembers: e.target.checked })} />
              دعوة جميع الأعضاء النشطين
            </label>
            <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">{submitting ? "جارِ الحفظ..." : "حفظ"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
