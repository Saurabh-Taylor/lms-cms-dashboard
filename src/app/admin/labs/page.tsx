import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { LabsTable, LabsActions } from "./labs-table";

export default function LabsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Labs"
        description="Hands-on environments: create, assign and monitor"
        actions={<LabsActions />}
      />
      <Suspense>
        <LabsTable />
      </Suspense>
    </div>
  );
}
