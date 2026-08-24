"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiDownloadUrl, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";

interface PreviewResult {
  jobId: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  validRowsPreview: Array<{ fullName: string; nationalId: string; phone: string }>;
  errors: Array<{ rowNumber: number; errorMessage: string }>;
}

export default function ImportMembersPage() {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.push("الرجاء اختيار ملف Excel أولًا", "error");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const result = await apiFetch<PreviewResult>("/api/v1/members/import/preview", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
      setPreview(result);
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّرت معالجة الملف", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setCommitting(true);
    try {
      const result = await apiFetch<{ importedRows: number }>("/api/v1/members/import/commit", {
        method: "POST",
        body: { jobId: preview.jobId },
      });
      toast.push(`تم استيراد ${result.importedRows} عضو بنجاح`, "success");
      router.push("/admin/members");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إتمام الاستيراد", "error");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-lg font-bold text-gray-900">استيراد أعضاء من Excel</h1>

      <div className="card">
        <p className="mb-3 text-sm text-gray-600">
          يجب أن يحتوي الملف على الأعمدة التالية: الاسم، الهوية، الجوال، البريد الإلكتروني، وزن الصوت، رقم العضوية الفعلي.
        </p>
        <form onSubmit={handleUpload} className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="input" />
          <button type="submit" disabled={loading} className="btn-primary shrink-0">
            {loading ? "جارِ المعالجة..." : "معاينة"}
          </button>
        </form>
      </div>

      {preview && (
        <div className="card space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold">{preview.totalRows}</p><p className="text-xs text-gray-500">إجمالي الصفوف</p></div>
            <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xl font-bold text-emerald-700">{preview.validCount}</p><p className="text-xs text-emerald-600">صفوف صحيحة</p></div>
            <div className="rounded-lg bg-red-50 p-3"><p className="text-xl font-bold text-red-700">{preview.invalidCount}</p><p className="text-xs text-red-600">صفوف بها أخطاء</p></div>
          </div>

          {preview.invalidCount > 0 && (
            <a
              href={apiDownloadUrl(`/api/v1/members/import/${preview.jobId}/errors-report`)}
              className="btn-secondary inline-block"
              target="_blank"
            >
              تنزيل تقرير الأخطاء
            </a>
          )}

          {preview.validCount > 0 && (
            <button onClick={handleCommit} disabled={committing} className="btn-primary w-full">
              {committing ? "جارِ الاستيراد..." : `استيراد ${preview.validCount} عضو`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
