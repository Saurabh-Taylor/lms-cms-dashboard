import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, UsersTableActions } from "@/components/learners/users-table";

export default function LearnersPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Learners"
        description="Manage learner accounts, enrollments and access"
        actions={<UsersTableActions role="learner" />}
      />
      <Suspense>
        <UsersTable role="learner" />
      </Suspense>
    </div>
  );
}
