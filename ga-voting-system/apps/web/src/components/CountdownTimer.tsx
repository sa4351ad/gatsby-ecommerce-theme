"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * عداد تنازلي للعرض فقط — لا يُعتمد عليه في تحديد إمكانية التصويت من عدمها؛
 * القرار النهائي دومًا من الخادم عند إرسال الطلب (Section 26).
 */
export function CountdownTimer({ endAt, onExpire }: { endAt: string; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => new Date(endAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date(endAt).getTime() - Date.now();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endAt, onExpire]);

  const expired = remaining <= 0;

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${expired ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-700"}`}>
      <span>{expired ? "انتهى وقت التصويت" : "الوقت المتبقي"}</span>
      {!expired && <span dir="ltr" className="font-mono tabular-nums">{format(remaining)}</span>}
    </div>
  );
}
