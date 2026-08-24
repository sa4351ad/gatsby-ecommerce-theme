const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "مسودة", className: "bg-gray-100 text-gray-700" },
  SCHEDULED: { label: "مجدوَل", className: "bg-amber-100 text-amber-800" },
  OPEN: { label: "مفتوح", className: "bg-emerald-100 text-emerald-800" },
  CLOSED: { label: "مغلق", className: "bg-gray-200 text-gray-700" },
  CANCELLED: { label: "ملغى", className: "bg-red-100 text-red-700" },
  ARCHIVED: { label: "مؤرشف", className: "bg-slate-100 text-slate-600" },
  ACTIVE: { label: "نشط", className: "bg-emerald-100 text-emerald-800" },
  INACTIVE: { label: "غير نشط", className: "bg-gray-100 text-gray-700" },
  SUSPENDED: { label: "موقوف", className: "bg-red-100 text-red-700" },
  EXPIRED: { label: "منتهي", className: "bg-amber-100 text-amber-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
