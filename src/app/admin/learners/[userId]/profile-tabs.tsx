"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { LocalListTable } from "@/components/shared/local-list-table";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";

interface LabAssignRow {
  id: number; labId: number; labName: string; labType: string;
  status: string; assignedAt: number; expiresAt: number | null; courseTitle: string | null;
}
interface AttemptRow {
  id: number; assessmentTitle: string; kind: string; attemptNo: number;
  score: number; passed: boolean; submittedAt: number;
}
interface CertRow {
  id: number; serial: string; courseTitle: string; issuedAt: number;
}
interface ActRow {
  id: number; type: string; courseTitle: string | null; createdAt: number;
}

const labCols: ColumnDef<LabAssignRow, unknown>[] = [
  { id: "labName", accessorKey: "labName", header: "Lab", cell: ({ getValue, row }) => (
    <div><span className="font-medium">{getValue() as string}</span>
    <span className="ml-2 text-xs text-muted-foreground">{row.original.labType}</span></div>
  ) },
  { id: "status", accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  { id: "courseTitle", accessorKey: "courseTitle", header: "Via course", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span> },
  { id: "assignedAt", accessorKey: "assignedAt", header: "Assigned", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span> },
];

const attemptCols: ColumnDef<AttemptRow, unknown>[] = [
  { id: "assessmentTitle", accessorKey: "assessmentTitle", header: "Assessment", cell: ({ getValue, row }) => (
    <div><span className="font-medium">{getValue() as string}</span>
    <span className="ml-2 text-xs capitalize text-muted-foreground">{row.original.kind} · attempt {row.original.attemptNo}</span></div>
  ) },
  { id: "score", accessorKey: "score", header: "Score", meta: { className: "text-right", headerClassName: "text-right" },
    cell: ({ getValue }) => <span className="tabular-nums font-medium">{getValue() as number}%</span> },
  { id: "passed", accessorKey: "passed", header: "Result", cell: ({ getValue }) => <StatusBadge value={getValue() ? "passed" : "failed"} /> },
  { id: "submittedAt", accessorKey: "submittedAt", header: "Submitted", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
];

const certCols: ColumnDef<CertRow, unknown>[] = [
  { id: "serial", accessorKey: "serial", header: "Serial", cell: ({ getValue }) => <code className="text-xs">{getValue() as string}</code> },
  { id: "courseTitle", accessorKey: "courseTitle", header: "Course", cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { id: "issuedAt", accessorKey: "issuedAt", header: "Issued", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDate(getValue() as number)}</span> },
];

const actCols: ColumnDef<ActRow, unknown>[] = [
  { id: "type", accessorKey: "type", header: "Event", cell: ({ getValue }) => <span className="font-medium">{(getValue() as string).replace(/_/g, " ")}</span> },
  { id: "courseTitle", accessorKey: "courseTitle", header: "Course", cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) ?? "—"}</span> },
  { id: "createdAt", accessorKey: "createdAt", header: "When", cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtDateTime(getValue() as number)}</span> },
];

export function LearnerProfileTabs({
  userId, stats,
}: {
  userId: number;
  stats: { enrolledCount: number; labsCount: number; avgProgress: number };
}) {
  return (
    <Tabs defaultValue="enrollments">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        <TabsTrigger value="labs">Labs</TabsTrigger>
        <TabsTrigger value="assessments">Assessments</TabsTrigger>
        <TabsTrigger value="certificates">Certificates</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <div className="grid grid-cols-3 gap-3 max-w-2xl">
          <Card><CardContent className="pt-4">
            <p className="text-2xl font-semibold tabular-nums">{stats.enrolledCount}</p>
            <p className="text-xs text-muted-foreground">Enrolled courses</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-2xl font-semibold tabular-nums">{stats.labsCount}</p>
            <p className="text-xs text-muted-foreground">Assigned labs</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold tabular-nums">{stats.avgProgress}%</p>
            </div>
            <p className="text-xs text-muted-foreground">Average progress</p>
            <Progress value={stats.avgProgress} className="mt-2 h-1.5" />
          </CardContent></Card>
        </div>
      </TabsContent>

      <TabsContent value="enrollments" className="mt-4">
        <EnrollmentsTable fixedUserId={userId} hideLearnerCol compact />
      </TabsContent>

      <TabsContent value="labs" className="mt-4">
        <LocalListTable<LabAssignRow>
          endpoint="/api/admin/lab-assignments"
          params={{ userId }}
          columns={labCols}
          emptyTitle="No labs assigned"
          emptyDescription="Assign a lab to give this learner hands-on practice."
        />
      </TabsContent>

      <TabsContent value="assessments" className="mt-4">
        <LocalListTable<AttemptRow>
          endpoint="/api/admin/attempts"
          params={{ userId }}
          columns={attemptCols}
          emptyTitle="No assessment results"
        />
      </TabsContent>

      <TabsContent value="certificates" className="mt-4">
        <LocalListTable<CertRow>
          endpoint="/api/admin/certificates"
          params={{ userId }}
          columns={certCols}
          emptyTitle="No certificates earned yet"
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-4">
        <LocalListTable<ActRow>
          endpoint="/api/admin/activity"
          params={{ userId }}
          columns={actCols}
          emptyTitle="No activity recorded"
        />
      </TabsContent>
    </Tabs>
  );
}
