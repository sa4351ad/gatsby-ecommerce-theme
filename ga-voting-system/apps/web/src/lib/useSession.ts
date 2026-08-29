"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, ApiClientError } from "./apiClient";

export interface SessionUser {
  id: string;
  email: string | null;
  role: string;
  permissions: string[];
  member: {
    id: string;
    fullName: string;
    membershipNumberSystem: string;
    membershipNumberReal: string | null;
    votingWeight: string;
    status: string;
    avatarUrl: string | null;
    phone: string;
    email: string | null;
  } | null;
}

export function useSession() {
  // إعادة قراءة الجلسة عند كل تغيّر في المسار: صفحة تسجيل الدخول ولوحة الإدارة يشتركان
  // في نفس Layout (لا يُعاد تركيبه بين المسارين)، فبدون هذا الاعتماد على pathname يبقى
  // user محتفظًا بالقيمة القديمة (null قبل الدخول) بعد نجاح الدخول والانتقال إلى /admin،
  // فتُعيد بوابة الحماية توجيه المستخدم فورًا إلى صفحة الدخول رغم نجاح المصادقة فعليًا.
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiFetch<SessionUser>("/api/v1/auth/me")
      .then((data) => mounted && setUser(data))
      .catch((err) => {
        if (!mounted) return;
        setUser(null);
        if (!(err instanceof ApiClientError && err.status === 401)) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [pathname]);

  return { user, loading };
}
