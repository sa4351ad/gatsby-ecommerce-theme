"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";

interface VotingSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startAt: string;
  endAt: string;
}

interface MyVotingsResponse {
  pending: VotingSummary[];
  completed: VotingSummary[];
  upcoming: VotingSummary[];
  closedNotVoted: VotingSummary[];
}

export default function MemberDashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<MyVotingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "MEMBER") {
      router.replace("/admin");
      return;
    }
    apiFetch<MyVotingsResponse>("/api/v1/votings/mine")
      .then(setData)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل البيانات"));
  }, [user, sessionLoading, router]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // تجاهل
    }
    toast.push("تم تسجيل الخروج");
    router.push("/login");
  }

  if (sessionLoading || !user) return <LoadingState />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">مرحبًا، {user.member?.fullName}</h1>
          <p className="text-sm text-gray-500">رقم العضوية: {user.member?.membershipNumberSystem}</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          تسجيل الخروج
        </button>
      </header>

      <section className="card mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ProfileStat label="حالة العضوية" value={<StatusBadge status={user.member?.status ?? ""} />} />
        <ProfileStat label="وزن التصويت" value={user.member?.votingWeight ?? "—"} />
        <ProfileStat label="الجوال" value={maskPhone(user.member?.phone)} />
        <ProfileStat label="البريد الإلكتروني" value={user.member?.email ?? "—"} />
      </section>

      {error && <ErrorState message={error} />}

      {!error && !data && <LoadingState />}

      {data && (
        <>
          {data.pending.length > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-red-50 px-5 py-4 ring-1 ring-red-200">
              <div>
                <p className="font-bold text-red-700">🔴 لديك {data.pending.length} تصويتات تحتاج إلى اعتماد</p>
                <p className="text-sm text-red-600">يرجى المشاركة قبل انتهاء المهلة المحددة</p>
              </div>
            </div>
          )}

          <VotingSection title="التصويتات المطلوبة مني" items={data.pending} emptyLabel="لا توجد تصويتات مطلوبة حاليًا" />
          <VotingSection title="تصويتات قادمة" items={data.upcoming} emptyLabel="لا توجد تصويتات قادمة" />
          <VotingSection title="تصويتات مكتملة" items={data.completed} emptyLabel="لم تشارك في أي تصويت بعد" />
        </>
      )}
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function maskPhone(phone?: string) {
  if (!phone) return "—";
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

function VotingSection({ title, items, emptyLabel }: { title: string; items: VotingSummary[]; emptyLabel: string }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold text-gray-700">{title}</h2>
      {items.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <div className="space-y-3">
          {items.map((v) => (
            <Link
              key={v.id}
              href={`/voting/${v.id}`}
              className="card flex items-center justify-between transition hover:ring-brand-300"
            >
              <div>
                <p className="font-semibold text-gray-900">{v.title}</p>
                {v.description && <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{v.description}</p>}
              </div>
              <StatusBadge status={v.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
