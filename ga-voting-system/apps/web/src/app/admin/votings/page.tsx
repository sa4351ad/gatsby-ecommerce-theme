"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";

interface VotingListItem {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  kind: string;
  _count: { questions: number; confirmations: number; eligibilities: number };
}

export default function VotingsListPage() {
  const [votings, setVotings] = useState<VotingListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<VotingListItem[]>("/api/v1/votings")
      .then(setVotings)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل التصويتات"));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">التصويتات</h1>
        <Link href="/admin/votings/new" className="btn-primary">+ تصويت جديد</Link>
      </div>

      {error && <ErrorState message={error} />}
      {!error && !votings && <LoadingState />}
      {votings && votings.length === 0 && <EmptyState title="لا توجد تصويتات بعد" />}

      {votings && votings.length > 0 && (
        <div className="space-y-3">
          {votings.map((v) => (
            <Link key={v.id} href={`/admin/votings/${v.id}`} className="card flex items-center justify-between hover:ring-brand-300">
              <div>
                <p className="font-semibold text-gray-900">{v.title}</p>
                <p className="text-sm text-gray-500">
                  {v.kind === "ELECTION" ? "انتخابات" : "قرار"} · {v._count.confirmations} من {v._count.eligibilities} صوّتوا
                </p>
              </div>
              <StatusBadge status={v.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
