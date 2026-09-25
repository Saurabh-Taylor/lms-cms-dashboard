import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityTable } from "./activity-table";

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Learner Activity"
        description="Inspect what learners did, when, and in which course"
      />
      <Suspense><ActivityTable /></Suspense>
    </div>
  );
}
