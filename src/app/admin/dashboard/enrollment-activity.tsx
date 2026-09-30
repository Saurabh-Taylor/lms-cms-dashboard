"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api-client";
import type { EnrollmentSeriesPoint } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const EnrollmentChart = dynamic(() => import("./enrollment-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-56 w-full" />,
});

const RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y", value: 365 },
];

/** Range-scoped enrollment chart — the only dashboard section `range` affects,
 *  so it owns its own query and leaves the rest of the page untouched. */
export function EnrollmentActivity() {
  const [range, setRange] = React.useState(30);
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["dashboard", "enrollment-series", range],
    queryFn: () =>
      api<EnrollmentSeriesPoint[]>(
        `/api/admin/dashboard/enrollment-series${qs({ range })}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return (
    <Card className="xl:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Enrollment activity</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-56 flex-1">
        {isLoading ? (
          <Skeleton className="h-full min-h-56 w-full" />
        ) : (
          // Dim instead of blanking while the next range resolves.
          <div className={cn("h-full transition-opacity", isPlaceholderData && "opacity-60")}>
            <EnrollmentChart data={data ?? []} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
