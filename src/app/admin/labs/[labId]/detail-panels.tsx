"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { LocalListTable } from "@/components/shared/local-list-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDate } from "@/lib/format";

interface AssignRow {
  id: number; userId: number; userName: string; courseTitle: string | null;
  status: string; assignedAt: number; expiresAt: number | null;
}

const cols: ColumnDef<AssignRow, unknown>[] = [
  { id: "userName", accessorKey: "userName", header: "Learner", cell: ({ row }) => (
    <Link href={`/admin/learners/${row.original.userId}` as never} className="font-medium hover:underline">
      {row.original.userName}
    </Link>
  ) },
  { id: "courseTitle", accessorKey: "courseTitle", header: "Via course", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span> },
  { id: "status", accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  { id: "assignedAt", accessorKey: "assignedAt", header: "Assigned", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
  { id: "expiresAt", accessorKey: "expiresAt", header: "Expires", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue() ? fmtDate(getValue() as number) : "—"}</span> },
];

export function LabDetailPanels({ labId }: { labId: number }) {
  return (
    <LocalListTable<AssignRow>
      endpoint="/api/admin/lab-assignments"
      params={{ labId }}
      columns={cols}
      emptyTitle="No learners assigned"
      emptyDescription="Assign this lab to learners from the labs list or a learner profile."
    />
  );
}
