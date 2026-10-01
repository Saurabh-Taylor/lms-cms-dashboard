import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, UsersTableActions } from "@/components/learners/users-table";
import { getCurrentUser } from "@/lib/me";

export default async function InstructorsPage() {
  const me = await getCurrentUser();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Instructors"
        description="Instructor accounts and course ownership"
        actions={<UsersTableActions meAppRole={me?.appRole} role="instructor" />}
      />
      <Suspense>
        <UsersTable role="instructor" meId={me?.id} meAppRole={me?.appRole} />
      </Suspense>
    </div>
  );
}
