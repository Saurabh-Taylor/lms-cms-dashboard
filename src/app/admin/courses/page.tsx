import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CoursesTable } from "./courses-table";
import { CoursesHeaderActions } from "./header-actions";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Courses"
        description="Create, organize and publish learning content"
        actions={<CoursesHeaderActions />}
      />
      <Suspense>
        <CoursesTable openNew={sp.new === "1"} />
      </Suspense>
    </div>
  );
}
