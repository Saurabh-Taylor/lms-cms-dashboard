import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { GroupsTable, GroupActions } from "./groups-table";

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Groups / Cohorts" description="Organize learners into cohorts for bulk management" actions={<GroupActions />} />
      <Suspense><GroupsTable /></Suspense>
    </div>
  );
}
