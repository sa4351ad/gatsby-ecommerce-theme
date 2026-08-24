export function LoadingState({ label = "جارِ التحميل..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-14 text-center text-gray-500">
      <p className="text-base font-medium text-gray-700">{title}</p>
      {description && <p className="max-w-sm text-sm">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
      {message}
    </div>
  );
}
