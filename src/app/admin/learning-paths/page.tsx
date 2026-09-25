import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PathsTable, PathActions } from "./paths-table";

export default function LearningPathsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Learning Paths" description="Ordered sequences of courses" actions={<PathActions />} />
      <Suspense><PathsTable /></Suspense>
    </div>
  );
}
