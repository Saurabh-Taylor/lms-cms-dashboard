"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { SessionUser } from "@/lib/me";
import type { UiPreferences } from "@/lib/ui-preferences";

/** /api/admin/me wire shape — sessionShape minus previewing. */
interface AdminMeResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  appRole: string;
  permissions: string[];
  uiPreferences?: UiPreferences | null;
}

/**
 * Canonical client-side session — one key, one fetch, one invalidation
 * channel. MeProvider seeds it from the shell's server-loaded SessionUser,
 * so consumers almost never trigger this fetch.
 */
export function useMe() {
  return useQuery<SessionUser>({
    queryKey: qk.me,
    staleTime: 60_000,
    queryFn: () =>
      api<AdminMeResponse>("/api/admin/me").then((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        appRole: r.appRole,
        permissions: r.permissions ?? [],
        previewing: null,
        uiPreferences: r.uiPreferences ?? {},
      })),
  });
}

/** The current user's permission keys — `usePermissions().has(PERM.x)`. */
export function usePermissions(): Set<string> {
  const me = useMe();
  return React.useMemo(
    () => new Set(me.data?.permissions ?? []),
    [me.data?.permissions]
  );
}
