import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, UsersTableActions } from "@/components/learners/users-table";
import { getCurrentUser } from "@/lib/me";

export default async function LearnersPage() {
  const me = await getCurrentUser();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Learners"
        description="Manage learner accounts, enrollments and access"
        actions={<UsersTableActions role="learner" />}
      />
      <Suspense>
        <UsersTable role="learner" meId={me?.id} />
      </Suspense>
    </div>
  );
}
