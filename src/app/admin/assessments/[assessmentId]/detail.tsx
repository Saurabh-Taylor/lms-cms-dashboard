"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { LocalListTable } from "@/components/shared/local-list-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDateTime } from "@/lib/format";

interface AttemptRow {
  id: number; userId: number; userName: string; attemptNo: number;
  score: number; passed: boolean; submittedAt: number;
}

const cols: ColumnDef<AttemptRow, unknown>[] = [
  { id: "userName", accessorKey: "userName", header: "Learner", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "attemptNo", accessorKey: "attemptNo", header: "Attempt", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums">#{getValue() as number}</span> },
  { id: "score", accessorKey: "score", header: "Score", meta: { className: "text-right", headerClassName: "text-right" }, cell: ({ getValue }) => <span className="tabular-nums font-medium">{getValue() as number}%</span> },
  { id: "passed", accessorKey: "passed", header: "Result", cell: ({ getValue }) => <StatusBadge value={getValue() ? "passed" : "failed"} /> },
  { id: "submittedAt", accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDateTime(getValue() as number)}</span> },
];

export function AssessmentDetail({ id }: { id: number }) {
  return (
    <LocalListTable<AttemptRow>
      endpoint="/api/admin/attempts"
      params={{ assessmentId: id }}
      columns={cols}
      emptyTitle="No attempts yet"
      emptyDescription="Learner attempts will appear here."
    />
  );
}
