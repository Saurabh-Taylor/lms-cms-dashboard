import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, UsersTableActions } from "@/components/learners/users-table";

export default function InstructorsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Instructors"
        description="Instructor accounts and course ownership"
        actions={<UsersTableActions role="instructor" />}
      />
      <Suspense>
        <UsersTable role="instructor" />
      </Suspense>
    </div>
  );
}
