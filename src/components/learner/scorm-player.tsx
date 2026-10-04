"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { installScormApi, type ScormSessionInfo } from "@/lib/scorm/api-shim";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * SCORM block player — opens a learner session (attempt + launch token),
 * installs the runtime API shims on this window so the iframe's SCO finds
 * them via window.parent, then points the iframe at the same-origin launch
 * URL. Completion/score CMI commits backend-side → lessonProgress rollup.
 *
 * Session open is a mutation deliberately riding useQuery: the queryKey
 * dedupes double-mounts (StrictMode) and every mount must get a *fresh*
 * attempt — a terminated session id can never be resumed, so nothing may be
 * cached (staleTime 0 + refetchOnMount always).
 */
export function ScormPlayer({ lessonId, title }: { lessonId: number; title?: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["/api/learner/scorm-sessions", lessonId],
    queryFn: () =>
      api<ScormSessionInfo>("/api/learner/scorm-sessions", {
        method: "POST",
        body: JSON.stringify({ lessonId }),
      }),
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

  React.useEffect(() => {
    if (!data) return;
    const handle = installScormApi(window, data);
    return () => {
      handle.teardown();
      // Attempt terminated on the way out — progress may have moved.
      for (const key of qk.learnerProgress)
        void queryClient.invalidateQueries({ queryKey: key });
    };
  }, [data, queryClient]);

  if (isLoading) return <Skeleton className="h-[60vh] w-full" />;
  if (isError || !data)
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed bg-muted/30 p-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <PackageIcon className="size-4" />
        </div>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {(error as Error)?.message ?? "This SCORM package could not be launched."}
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );

  return (
    <iframe
      key={data.sessionId}
      src={data.launchUrl}
      title={title ?? "SCORM package"}
      className="h-[70vh] w-full rounded-md border bg-white"
      allow="autoplay; fullscreen"
    />
  );
}
