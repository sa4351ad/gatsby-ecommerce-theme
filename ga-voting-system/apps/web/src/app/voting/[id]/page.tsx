"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { useSession } from "@/lib/useSession";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LoadingState, ErrorState } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";

interface VotingOption {
  id: string;
  label: string;
  description: string | null;
  candidate?: { bio: string | null; photoUrl: string | null } | null;
}
interface VotingQuestion {
  id: string;
  type: string;
  text: string;
  description: string | null;
  minSelections: number | null;
  maxSelections: number | null;
  seatsCount: number | null;
  options: VotingOption[];
}
interface VotingDetail {
  id: string;
  title: string;
  description: string | null;
  legalText: string | null;
  status: string;
  startAt: string;
  endAt: string;
  isSecret: boolean;
  allowVoteChange: boolean;
  questions: VotingQuestion[];
}
interface MyStatus {
  isEligible: boolean;
  hasVoted: boolean;
  referenceNumber?: string;
  confirmedAt?: string;
}
interface AnswerState {
  selectedOptionIds: string[];
  ratingValue?: number;
}

type Step = "vote" | "review" | "otp" | "success";

export default function VotingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user, loading: sessionLoading } = useSession();

  const [voting, setVoting] = useState<VotingDetail | null>(null);
  const [myStatus, setMyStatus] = useState<MyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [step, setStep] = useState<Step>("vote");
  const [submitting, setSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [successData, setSuccessData] = useState<{ referenceNumber: string; confirmedAt: string } | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<VotingDetail>(`/api/v1/votings/${params.id}`),
      apiFetch<MyStatus>(`/api/v1/votings/${params.id}/my-status`),
    ])
      .then(([v, s]) => {
        setVoting(v);
        setMyStatus(s);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل التصويت"));
  }, [params.id, user, sessionLoading, router]);

  const canEdit = useMemo(() => {
    if (!voting || !myStatus) return false;
    if (voting.status !== "OPEN") return false;
    if (myStatus.hasVoted && !voting.allowVoteChange) return false;
    return true;
  }, [voting, myStatus]);

  function setSingleAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: { selectedOptionIds: [optionId] } }));
  }

  function toggleMultiAnswer(questionId: string, optionId: string, max: number) {
    setAnswers((prev) => {
      const current = prev[questionId]?.selectedOptionIds ?? [];
      const exists = current.includes(optionId);
      let next: string[];
      if (exists) next = current.filter((id) => id !== optionId);
      else if (current.length >= max) return prev; // منع تجاوز الحد الأقصى في الواجهة (الخادم يتحقق أيضًا)
      else next = [...current, optionId];
      return { ...prev, [questionId]: { selectedOptionIds: next } };
    });
  }

  function setRatingAnswer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { selectedOptionIds: [], ratingValue: value } }));
  }

  function buildPayloadAnswers() {
    return (voting?.questions ?? []).map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id]?.selectedOptionIds ?? [],
      ratingValue: answers[q.id]?.ratingValue,
    }));
  }

  async function handleGoToReview() {
    const missing = voting?.questions.filter((q) => {
      const a = answers[q.id];
      if (["RATING_5", "RATING_10"].includes(q.type)) return a?.ratingValue == null;
      return !a || a.selectedOptionIds.length === 0;
    });
    if (missing && missing.length > 0) {
      toast.push("الرجاء الإجابة على جميع الأسئلة قبل المتابعة", "error");
      return;
    }
    setStep("review");
  }

  async function submitConfirmation(code?: string) {
    if (!voting) return;
    setSubmitting(true);
    try {
      const result = await apiFetch<{ referenceNumber: string; confirmedAt: string }>(
        `/api/v1/votings/${voting.id}/confirm`,
        { method: "POST", body: { answers: buildPayloadAnswers(), otpCode: code } },
      );
      setSuccessData(result);
      setStep("success");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "تعذّر اعتماد التصويت";
      if (message.includes("رمز التحقق مطلوب")) {
        setOtpRequired(true);
        setStep("otp");
        try {
          await apiFetch(`/api/v1/votings/${voting.id}/confirm/request-otp`, { method: "POST" });
          toast.push("تم إرسال رمز تحقق لاعتماد التصويت");
        } catch {
          // تجاهل
        }
      } else {
        toast.push(message, "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || (!voting && !error)) return <LoadingState />;
  if (error) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={error} /></div>;
  if (!voting) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24">
      <button onClick={() => router.push("/dashboard")} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
        ← العودة للوحتي
      </button>

      <header className="card mb-6">
        <div className="mb-2 flex items-center justify-between">
          <StatusBadge status={voting.status} />
          {voting.isSecret && <span className="badge bg-purple-100 text-purple-700">تصويت سري</span>}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{voting.title}</h1>
        {voting.description && <p className="mt-1 text-sm text-gray-600">{voting.description}</p>}
        {voting.legalText && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-6 text-gray-500">{voting.legalText}</p>}
        <div className="mt-4">
          {voting.status === "OPEN" && <CountdownTimer endAt={voting.endAt} onExpire={() => setError("انتهى وقت هذا التصويت")} />}
        </div>
      </header>

      {myStatus?.hasVoted && !voting.allowVoteChange && step !== "success" && (
        <div className="card mb-6 border border-emerald-200 bg-emerald-50 text-center text-emerald-700">
          لقد قمت بالتصويت والاعتماد مسبقًا في هذا التصويت.
          {myStatus.referenceNumber && <p className="mt-1 text-xs">الرقم المرجعي: {myStatus.referenceNumber}</p>}
        </div>
      )}

      {!canEdit && !(myStatus?.hasVoted && !voting.allowVoteChange) && (
        <ErrorState message="لا يمكن التصويت في هذا التصويت حاليًا (خارج الفترة الزمنية أو الحالة غير مفتوحة)" />
      )}

      {canEdit && step === "vote" && (
        <div className="space-y-5">
          {voting.questions.map((q) => (
            <QuestionCard key={q.id} question={q} answer={answers[q.id]} onSingle={setSingleAnswer} onMulti={toggleMultiAnswer} onRating={setRatingAnswer} />
          ))}
          <button onClick={handleGoToReview} className="btn-primary w-full">
            مراجعة التصويت
          </button>
        </div>
      )}

      {canEdit && step === "review" && (
        <div className="space-y-5">
          <div className="card">
            <h2 className="mb-4 text-sm font-bold text-gray-700">مراجعة اختياراتك</h2>
            <div className="space-y-4">
              {voting.questions.map((q) => (
                <div key={q.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <p className="text-sm font-medium text-gray-800">{q.text}</p>
                  <p className="mt-1 text-sm text-brand-700">
                    {answers[q.id]?.ratingValue != null
                      ? `التقييم: ${answers[q.id].ratingValue}`
                      : q.options.filter((o) => answers[q.id]?.selectedOptionIds.includes(o.id)).map((o) => o.label).join("، ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            {voting.allowVoteChange
              ? "يمكنك تعديل تصويتك لاحقًا قبل إغلاق التصويت."
              : "تنبيه: بعد اعتماد التصويت لا يمكنك تغييره."}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("vote")} className="btn-secondary flex-1">تعديل الاختيارات</button>
            <button onClick={() => submitConfirmation()} disabled={submitting} className="btn-primary flex-1">
              {submitting ? "جارِ الاعتماد..." : "اعتماد التصويت نهائيًا"}
            </button>
          </div>
        </div>
      )}

      {step === "otp" && otpRequired && (
        <div className="card space-y-4">
          <p className="text-sm text-gray-600">تم إرسال رمز تحقق إضافي لاعتماد تصويتك، الرجاء إدخاله:</p>
          <input
            className="input text-center text-2xl tracking-[0.5em]"
            dir="ltr"
            maxLength={6}
            inputMode="numeric"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
          />
          <button onClick={() => submitConfirmation(otpCode)} disabled={submitting || otpCode.length !== 6} className="btn-primary w-full">
            تأكيد الاعتماد
          </button>
        </div>
      )}

      {step === "success" && successData && (
        <div className="card space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
          <h2 className="text-lg font-bold text-gray-900">تم اعتماد تصويتك بنجاح</h2>
          <div className="mx-auto max-w-xs space-y-1 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <p>رقم العملية: <span className="font-mono font-semibold">{successData.referenceNumber}</span></p>
            <p>التاريخ: {new Date(successData.confirmedAt).toLocaleString("ar-SA")}</p>
            <p>التصويت: {voting.title}</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="btn-primary w-full">
            العودة للوحتي
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  onSingle,
  onMulti,
  onRating,
}: {
  question: VotingQuestion;
  answer?: AnswerState;
  onSingle: (qId: string, optId: string) => void;
  onMulti: (qId: string, optId: string, max: number) => void;
  onRating: (qId: string, value: number) => void;
}) {
  const selected = answer?.selectedOptionIds ?? [];
  const isSingle = ["DECISION_APPROVAL", "YES_NO", "SINGLE_CHOICE"].includes(question.type);
  const isMulti = ["MULTIPLE_CHOICE", "ELECTION"].includes(question.type);
  const isRating = ["RATING_5", "RATING_10"].includes(question.type);
  const max = question.maxSelections ?? question.seatsCount ?? question.options.length;

  return (
    <div className="card">
      <p className="mb-1 font-semibold text-gray-900">{question.text}</p>
      {question.description && <p className="mb-3 text-sm text-gray-500">{question.description}</p>}
      {isMulti && (
        <p className="mb-3 text-xs text-brand-700">
          اختر {question.minSelections ?? 1} إلى {max} {question.type === "ELECTION" ? "مرشحين" : "خيارات"}
        </p>
      )}

      {isSingle && (
        <div className="space-y-2">
          {question.options.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                selected.includes(o.id) ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input type="radio" name={question.id} checked={selected.includes(o.id)} onChange={() => onSingle(question.id, o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}

      {isMulti && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                selected.includes(o.id) ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => onMulti(question.id, o.id, max)} className="mt-1" />
              <span>
                <span className="block font-medium">{o.label}</span>
                {o.candidate?.bio && <span className="block text-xs text-gray-500">{o.candidate.bio}</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      {isRating && (
        <div className="flex gap-2">
          {Array.from({ length: question.type === "RATING_5" ? 5 : 10 }, (_, i) => i + 1).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onRating(question.id, v)}
              className={`h-10 w-10 rounded-lg text-sm font-semibold transition ${
                answer?.ratingValue === v ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
