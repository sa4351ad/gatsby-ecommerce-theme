"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";

interface Group { id: string; name: string; }

const QUESTION_TYPES: Record<string, string> = {
  DECISION_APPROVAL: "قرار (موافق / غير موافق / ممتنع)",
  YES_NO: "نعم / لا",
  SINGLE_CHOICE: "اختيار واحد",
  MULTIPLE_CHOICE: "اختيار متعدد",
  ELECTION: "انتخابات (اختيار مرشحين)",
  RATING_5: "تقييم من 1 إلى 5",
  RATING_10: "تقييم من 1 إلى 10",
};

const NEEDS_OPTIONS = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "ELECTION"];

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewVotingPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const now = new Date();

  const [form, setForm] = useState({
    title: "",
    description: "",
    legalText: "",
    startAt: toLocalInput(now),
    endAt: toLocalInput(new Date(now.getTime() + 48 * 3600 * 1000)),
    isSecret: false,
    isWeighted: true,
    allowVoteChange: false,
    quorumType: "NONE" as string,
    quorumValue: "",
    targetType: "ALL" as string,
    targetGroupId: "",
    questionType: "DECISION_APPROVAL" as string,
    questionText: "",
    seatsCount: "3",
    minSelections: "1",
    maxSelections: "3",
    options: ["", ""],
  });

  useEffect(() => {
    apiFetch<Group[]>("/api/v1/groups").then(setGroups).catch(() => {});
  }, []);

  function updateOption(i: number, value: string) {
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? value : o)) }));
  }
  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  }
  function removeOption(i: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.questionText.trim()) {
      toast.push("الرجاء إدخال نص السؤال", "error");
      return;
    }
    const needsOptions = NEEDS_OPTIONS.includes(form.questionType);
    const cleanOptions = form.options.map((o) => o.trim()).filter(Boolean);
    if (needsOptions && cleanOptions.length < 2) {
      toast.push("يجب إضافة خيارين على الأقل", "error");
      return;
    }

    setSubmitting(true);
    try {
      const voting = await apiFetch<{ id: string }>("/api/v1/votings", {
        method: "POST",
        body: {
          title: form.title,
          description: form.description || undefined,
          legalText: form.legalText || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          isSecret: form.isSecret,
          isWeighted: form.isWeighted,
          allowVoteChange: form.allowVoteChange,
          quorumType: form.quorumType,
          quorumValue: form.quorumValue ? Number(form.quorumValue) : undefined,
          targetType: form.targetType,
          targetGroupId: form.targetType === "GROUP" ? form.targetGroupId : undefined,
          kind: form.questionType === "ELECTION" ? "ELECTION" : "STANDARD",
          questions: [
            {
              type: form.questionType,
              text: form.questionText,
              seatsCount: form.questionType === "ELECTION" ? Number(form.seatsCount) : undefined,
              minSelections: ["MULTIPLE_CHOICE", "ELECTION"].includes(form.questionType) ? Number(form.minSelections) : undefined,
              maxSelections: ["MULTIPLE_CHOICE", "ELECTION"].includes(form.questionType) ? Number(form.maxSelections) : undefined,
              options: needsOptions ? cleanOptions.map((label) => ({ label })) : [],
            },
          ],
        },
      });
      toast.push("تم إنشاء التصويت كمسودة", "success");
      router.push(`/admin/votings/${voting.id}`);
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إنشاء التصويت", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 pb-10">
      <h1 className="text-lg font-bold text-gray-900">إنشاء تصويت جديد</h1>

      <div className="card space-y-3">
        <div><label className="label">عنوان التصويت</label><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">الوصف</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="label">النص القانوني/التوضيحي (اختياري)</label><textarea className="input" value={form.legalText} onChange={(e) => setForm({ ...form, legalText: e.target.value })} /></div>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        <div><label className="label">بداية التصويت</label><input type="datetime-local" required className="input" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></div>
        <div><label className="label">نهاية التصويت</label><input type="datetime-local" required className="input" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></div>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-bold text-gray-700">الأعضاء المستهدفون</p>
        <select className="input" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })}>
          <option value="ALL">جميع الأعضاء المؤهلين</option>
          <option value="GROUP">مجموعة معينة</option>
        </select>
        {form.targetType === "GROUP" && (
          <select className="input" value={form.targetGroupId} onChange={(e) => setForm({ ...form, targetGroupId: e.target.value })}>
            <option value="">اختر المجموعة</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-bold text-gray-700">السؤال</p>
        <select className="input" value={form.questionType} onChange={(e) => setForm({ ...form, questionType: e.target.value })}>
          {Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input required className="input" placeholder="نص السؤال" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} />

        {form.questionType === "ELECTION" && (
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">عدد المقاعد</label><input type="number" min={1} className="input" value={form.seatsCount} onChange={(e) => setForm({ ...form, seatsCount: e.target.value })} /></div>
            <div><label className="label">الحد الأدنى</label><input type="number" min={1} className="input" value={form.minSelections} onChange={(e) => setForm({ ...form, minSelections: e.target.value })} /></div>
            <div><label className="label">الحد الأقصى</label><input type="number" min={1} className="input" value={form.maxSelections} onChange={(e) => setForm({ ...form, maxSelections: e.target.value })} /></div>
          </div>
        )}
        {form.questionType === "MULTIPLE_CHOICE" && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">الحد الأدنى للاختيارات</label><input type="number" min={1} className="input" value={form.minSelections} onChange={(e) => setForm({ ...form, minSelections: e.target.value })} /></div>
            <div><label className="label">الحد الأقصى للاختيارات</label><input type="number" min={1} className="input" value={form.maxSelections} onChange={(e) => setForm({ ...form, maxSelections: e.target.value })} /></div>
          </div>
        )}

        {NEEDS_OPTIONS.includes(form.questionType) && (
          <div className="space-y-2">
            <label className="label">{form.questionType === "ELECTION" ? "أسماء المرشحين" : "الخيارات"}</label>
            {form.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" value={o} onChange={(e) => updateOption(i, e.target.value)} placeholder={`خيار ${i + 1}`} />
                {form.options.length > 2 && <button type="button" onClick={() => removeOption(i)} className="btn-secondary">حذف</button>}
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm font-medium text-brand-600">+ إضافة خيار</button>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-bold text-gray-700">إعدادات إضافية</p>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.isWeighted} onChange={(e) => setForm({ ...form, isWeighted: e.target.checked })} /> تصويت موزون (حسب وزن كل عضو)</label>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.isSecret} onChange={(e) => setForm({ ...form, isSecret: e.target.checked })} /> تصويت سري</label>
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.allowVoteChange} onChange={(e) => setForm({ ...form, allowVoteChange: e.target.checked })} /> السماح بتغيير التصويت قبل الإغلاق</label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">نوع النصاب</label>
            <select className="input" value={form.quorumType} onChange={(e) => setForm({ ...form, quorumType: e.target.value })}>
              <option value="NONE">بدون نصاب</option>
              <option value="PERCENTAGE_OF_MEMBERS">نسبة من عدد الأعضاء</option>
              <option value="FIXED_COUNT">عدد ثابت</option>
              <option value="PERCENTAGE_OF_WEIGHT">نسبة من الأوزان</option>
            </select>
          </div>
          {form.quorumType !== "NONE" && (
            <div><label className="label">القيمة المطلوبة</label><input type="number" className="input" value={form.quorumValue} onChange={(e) => setForm({ ...form, quorumValue: e.target.value })} /></div>
          )}
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "جارِ الحفظ..." : "حفظ كمسودة"}
      </button>
    </form>
  );
}
