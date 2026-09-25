import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { EnrollmentActions } from "./enrollment-actions";

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Enrollments"
        description="Assign courses to learners, manage access and progress"
        actions={<EnrollmentActions openBulk={sp.bulk === "1"} />}
      />
      <Suspense>
        <EnrollmentsTable />
      </Suspense>
    </div>
  );
}
