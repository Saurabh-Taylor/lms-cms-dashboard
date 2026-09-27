import { eq, gte, lte } from "drizzle-orm";
import { auditLogs } from "@/lib/db/schema";
import { adminList } from "@/lib/api/list";
import { requirePermission } from "@/lib/me";
import { PERM } from "@/lib/permissions";

export async function GET(req: Request) {
  const me = await requirePermission(PERM.auditView);
  if (me instanceof Response) return me;
  return adminList(req, {
    from: auditLogs,
    filters: (c, lq) => {
      const module_ = lq.sp.get("module");
      if (module_) c.push(eq(auditLogs.module, module_));
      const actorId = lq.sp.get("actorId");
      if (actorId) c.push(eq(auditLogs.actorId, Number(actorId)));
      const targetType = lq.sp.get("targetType");
      if (targetType) c.push(eq(auditLogs.targetType, targetType));
      const from = lq.sp.get("from");
      if (from) c.push(gte(auditLogs.createdAt, new Date(Number(from))));
      const range = lq.sp.get("range");
      if (range) c.push(gte(auditLogs.createdAt, new Date(Date.now() - Number(range) * 86400000)));
      const to = lq.sp.get("to");
      if (to) c.push(lte(auditLogs.createdAt, new Date(Number(to))));
    },
    search: [auditLogs.actorName, auditLogs.action, auditLogs.targetLabel],
    sortMap: {
      createdAt: auditLogs.createdAt,
      actorName: auditLogs.actorName,
      module: auditLogs.module,
      action: auditLogs.action,
    },
    defaultSort: "createdAt",
  });
}
