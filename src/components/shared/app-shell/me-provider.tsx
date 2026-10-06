"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import type { SessionUser } from "@/lib/me";

/**
 * Seeds the client me-cache (qk.me) from the shell's server-loaded
 * SessionUser — the server copy is the seed, not a second freshness
 * channel. Mutations still propagate through TanStack invalidation.
 */
export function MeProvider({
  me,
  children,
}: {
  me: SessionUser;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  // Seed during the first render — before any child useQuery subscribes,
  // so no duplicate fetch fires on mount.
  React.useState(() => {
    qc.setQueryData(qk.me, me);
    return true;
  });
  // Re-seed when the server copy changes (layout re-render on navigation).
  React.useEffect(() => {
    qc.setQueryData(qk.me, me);
  }, [qc, me]);
  return <>{children}</>;
}
