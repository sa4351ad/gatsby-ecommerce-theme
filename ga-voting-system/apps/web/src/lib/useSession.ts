"use client";

import { useEffect, useState } from "react";
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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch<SessionUser>("/api/v1/auth/me")
      .then((data) => mounted && setUser(data))
      .catch((err) => {
        if (mounted && !(err instanceof ApiClientError && err.status === 401)) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
