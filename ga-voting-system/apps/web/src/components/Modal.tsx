"use client";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
