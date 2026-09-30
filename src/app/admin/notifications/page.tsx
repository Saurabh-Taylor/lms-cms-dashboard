import { LIST_PAGE_SIZE_DEFAULT } from "@microshala/contracts";
import { apiServer } from "@/lib/api-server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtRelative } from "@/lib/format";

interface AuditEvent {
  id: number;
  actorName: string;
  action: string;
  targetLabel: string;
  module: string;
  createdAt: string;
}

export default async function NotificationsPage() {
  const [annRes, events] = await Promise.all([
    apiServer<{ data: { id: number; title: string; body: string; audience: string; status: string; createdAt: string }[] }>(
      `/api/v1/admin/announcements?pageSize=${LIST_PAGE_SIZE_DEFAULT}&sort=createdAt&order=desc`,
    ).then((r) => r.data),
    apiServer<{ data: AuditEvent[] }>(
      `/api/v1/admin/audit-logs?pageSize=${LIST_PAGE_SIZE_DEFAULT}&sort=createdAt&order=desc`,
    ).then((r) => r.data),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Notifications" description="Recent broadcast announcements and platform events" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Announcements</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {annRes.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
            {annRes.map((a) => (
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
