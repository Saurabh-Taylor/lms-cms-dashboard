import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { groupMembers, groups, users } from "@/lib/db/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { LearnerProfileTabs } from "./profile-tabs";
import { LearnerActions } from "./learner-actions";
import { fmtDate, fmtRelative, initials } from "@/lib/format";

export default async function LearnerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) notFound();

  const cohorts = await db
    .select({ name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, id));

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
          {cohorts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {cohorts.map((c) => <Badge key={c.name} variant="outline" className="text-[10px]">{c.name}</Badge>)}
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
