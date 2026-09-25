import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyticsClient } from "./analytics-client";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Analytics" description="Actionable learner, course, and assessment metrics" />
      <Suspense><AnalyticsClient /></Suspense>
    </div>
  );
}
