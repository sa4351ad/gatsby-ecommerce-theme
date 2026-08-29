"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { apiFetch } from "@/lib/apiClient";
import { useToast } from "@/lib/toast";
import { LoadingState } from "@/components/States";

const NAV_ITEMS = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊" },
  { href: "/admin/members", label: "الأعضاء", icon: "👥" },
  { href: "/admin/groups", label: "المجموعات", icon: "🗂️" },
  { href: "/admin/meetings", label: "الاجتماعات", icon: "🗓️" },
  { href: "/admin/votings", label: "التصويتات", icon: "🗳️" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" },
  { href: "/admin/audit-log", label: "سجل التدقيق", icon: "📜" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (loading || isLoginPage) return;
    if (!user || user.role === "MEMBER") {
      router.replace("/admin/login");
    }
  }, [user, loading, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;
  if (loading || !user || user.role === "MEMBER") return <LoadingState />;

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // تجاهل
    }
    toast.push("تم تسجيل الخروج");
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-l border-gray-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">إ</div>
          <span className="font-bold text-gray-900">لوحة الإدارة</span>
        </div>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 ${
                pathname === item.href ? "bg-brand-50 text-brand-700" : ""
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <p className="text-sm text-gray-500">{user.email} — {ROLE_LABELS[user.role] ?? user.role}</p>
          <button onClick={handleLogout} className="btn-secondary">تسجيل الخروج</button>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدير عام",
  SYSTEM_ADMIN: "مدير نظام",
  VOTING_MANAGER: "مدير تصويت",
};
