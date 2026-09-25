import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcements, auditLogs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtRelative } from "@/lib/format";

export default async function NotificationsPage() {
  const [announce, events] = await Promise.all([
    db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(20),
    db.select({
      id: auditLogs.id, actorName: users.name, action: auditLogs.action,
      targetLabel: auditLogs.targetLabel, module: auditLogs.module,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs)
      .innerJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(desc(auditLogs.createdAt)).limit(20),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Notifications" description="Recent broadcast announcements and platform events" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Announcements</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {announce.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
            {announce.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-(length:--fs-meta) leading-4 text-muted-foreground">{a.body}</p>
                  <p className="mt-0.5 text-(length:--fs-meta) leading-4 text-muted-foreground">
                    to {a.audience} · {fmtRelative(a.createdAt)}
                  </p>
                </div>
                <StatusBadge value={a.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Admin activity</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {events.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <p className="text-sm">
                  <span className="font-medium">{e.actorName}</span>{" "}
                  <span className="text-muted-foreground">{e.action}</span>{" "}
                  <span className="font-medium">{e.targetLabel}</span>
                </p>
                <span className="shrink-0 text-(length:--fs-meta) leading-4 text-muted-foreground">{fmtRelative(e.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
