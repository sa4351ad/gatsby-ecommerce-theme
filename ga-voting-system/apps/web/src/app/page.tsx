"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { LoadingState } from "@/components/States";

export default function HomePage() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(user.role === "MEMBER" ? "/dashboard" : "/admin");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState />
    </div>
  );
}
