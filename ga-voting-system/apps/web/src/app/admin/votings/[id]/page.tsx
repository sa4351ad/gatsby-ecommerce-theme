"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, apiDownloadUrl, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState, ErrorState } from "@/components/States";

interface VotingDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startAt: string;
  endAt: string;
  isSecret: boolean;
  isWeighted: boolean;
  kind: string;
  questions: Array<{ id: string; text: string; type: string; options: Array<{ id: string; label: string }> }>;
}

interface OptionTally { optionId: string; label: string; voteCount: number; weightSum: number; percentageOfWeight: number; rank?: number; isWinner?: boolean; }
interface Results {
  eligibleCount: number; eligibleWeight: number; confirmedCount: number; confirmedWeight: number;
  nonVotersCount: number; participationRate: number;
  quorum: { required: boolean; isMet: boolean; achievedPercentageOfMembers: number; achievedPercentageOfWeight: number };
  questionResults: Array<{ question: { id: string; text: string }; tally: { options: OptionTally[] } }>;
}

const ACTIONS: Record<string, { action: string; label: string; className: string }[]> = {
  DRAFT: [{ action: "publish", label: "نشر التصويت (جدولة)", className: "btn-primary" }],
  SCHEDULED: [{ action: "open", label: "فتح التصويت الآن", className: "btn-primary" }],
  OPEN: [
    { action: "close", label: "إغلاق التصويت الآن", className: "btn-secondary" },
    { action: "cancel", label: "إلغاء التصويت", className: "btn-danger" },
  ],
};

export default function VotingDetailPage() {
  const params = useParams<{ id: string }>();
  const [voting, setVoting] = useState<VotingDetail | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      const v = await apiFetch<VotingDetail>(`/api/v1/votings/${params.id}`);
      setVoting(v);
      try {
        setResults(await apiFetch<Results>(`/api/v1/votings/${params.id}/results`));
      } catch {
        setResults(null);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل التصويت");
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function handleAction(action: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/votings/${params.id}/${action}`, { method: "POST" });
      toast.push("تم تنفيذ العملية بنجاح", "success");
      load();
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر تنفيذ العملية", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleBroadcast() {
    setBusy(true);
    try {
      const res = await apiFetch<{ sentCount: number }>("/api/v1/notifications/broadcast", {
        method: "POST",
        body: { votingId: params.id, channels: ["SMS", "INTERNAL"] },
      });
      toast.push(`تم إرسال الإشعار إلى ${res.sentCount} عضو`, "success");
    } catch (err) {
      toast.push(err instanceof ApiClientError ? err.message : "تعذّر إرسال الإشعار", "error");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!voting) return <LoadingState />;

  const availableActions = ACTIONS[voting.status] ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2"><StatusBadge status={voting.status} /> {voting.isSecret && <span className="badge bg-purple-100 text-purple-700">سري</span>}</div>
          <h1 className="text-lg font-bold text-gray-900">{voting.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableActions.map((a) => (
            <button key={a.action} disabled={busy} onClick={() => handleAction(a.action)} className={a.className}>{a.label}</button>
          ))}
          {(voting.status === "OPEN" || voting.status === "SCHEDULED") && (
            <button disabled={busy} onClick={handleBroadcast} className="btn-secondary">إرسال إشعار للأعضاء</button>
          )}
          <a href={apiDownloadUrl(`/api/v1/reports/votings/${voting.id}/non-voters`, { format: "csv" })} className="btn-secondary">تقرير من لم يصوّت</a>
        </div>
      </div>

      {voting.description && <p className="card text-sm text-gray-600">{voting.description}</p>}

      {results && (
        <div className="card space-y-4">
          <p className="text-sm font-bold text-gray-700">النتائج والمشاركة</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="المؤهلون" value={results.eligibleCount} />
            <Stat label="صوّتوا" value={results.confirmedCount} />
            <Stat label="لم يصوّتوا" value={results.nonVotersCount} />
            <Stat label="نسبة المشاركة" value={`${results.participationRate.toFixed(1)}%`} />
          </div>
          <div className={`rounded-lg px-3 py-2 text-sm font-medium ${results.quorum.isMet ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {results.quorum.required ? (results.quorum.isMet ? "✓ تحقق النصاب المطلوب" : "✗ لم يتحقق النصاب المطلوب") : "لا يشترط هذا التصويت نصابًا"}
          </div>

          {results.questionResults.map((qr) => (
            <div key={qr.question.id} className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-sm font-semibold text-gray-800">{qr.question.text}</p>
              <div className="space-y-2">
                {qr.tally.options
                  .slice()
                  .sort((a, b) => b.weightSum - a.weightSum)
                  .map((o) => (
                    <div key={o.optionId}>
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                        <span>{o.label} {o.isWinner && <span className="text-emerald-600">(فائز)</span>}</span>
                        <span>{o.voteCount} صوت · وزن {o.weightSum} · {o.percentageOfWeight.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, o.percentageOfWeight)}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
