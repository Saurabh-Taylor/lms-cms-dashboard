import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, UsersTableActions } from "@/components/learners/users-table";
import { getCurrentUser } from "@/lib/me";

export default async function AdministratorsPage() {
  const me = await getCurrentUser();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Administrators"
        description="Admin accounts with platform access"
        actions={<UsersTableActions meAppRole={me?.appRole} role="admin" />}
      />
      <Suspense>
        <UsersTable role="admin" meId={me?.id} meAppRole={me?.appRole} />
      </Suspense>
    </div>
  );
}
