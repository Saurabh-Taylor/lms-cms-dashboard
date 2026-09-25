import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, UsersTableActions } from "@/components/learners/users-table";

export default function AdministratorsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Administrators"
        description="Admin accounts with platform access"
        actions={<UsersTableActions role="admin" />}
      />
      <Suspense>
        <UsersTable role="admin" />
      </Suspense>
    </div>
  );
}
