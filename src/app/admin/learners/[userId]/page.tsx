import { notFound } from "next/navigation";
import { Suspense } from "react";
import { apiServer } from "@/lib/api-server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { LearnerProfileTabs } from "./profile-tabs";
import { LearnerActions } from "./learner-actions";
import { fmtDate, fmtRelative, initials } from "@/lib/format";

interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  enrolledCount: number;
  avgProgress: number;
  lastActiveAt: string | null;
  createdAt: string;
  groups: string[];
}

export default async function LearnerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  const u = await apiServer<AdminUserDetail>(`/api/v1/admin/users/${id}`).catch(() => null);
  if (!u) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="text-base">{initials(u.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{u.name}</h1>
            <StatusBadge value={u.status} />
            <Badge variant="secondary" className="capitalize">{u.role}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {u.email} · joined {fmtDate(u.createdAt)} · last active {fmtRelative(u.lastActiveAt)}
          </p>
          {u.groups.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {u.groups.map((name) => <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>)}
            </div>
          )}
        </div>
        <LearnerActions user={{ id: u.id, name: u.name, email: u.email, status: u.status }} />
      </div>

      <Suspense>
        <LearnerProfileTabs userId={id} stats={{
          enrolledCount: u.enrolledCount,
          avgProgress: u.avgProgress,
        }} />
      </Suspense>
    </div>
  );
}
