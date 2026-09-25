import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { AuditTable } from "./audit-table";

export default function AuditLogsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit Logs"
        description="Administrative actions across the platform"
      />
      <Suspense><AuditTable /></Suspense>
    </div>
  );
}
