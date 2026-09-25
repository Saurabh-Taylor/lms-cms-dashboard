import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

/** Writes a human-readable audit entry for an admin action. */
export function audit(input: {
  action: string;
  targetType: string;
  targetId?: number | null;
  targetLabel: string;
  module: string;
  details?: Record<string, unknown>;
}) {
  db.insert(auditLogs)
    .values({
      actorId: 1, // demo: no auth — attribute to first admin
      actorName: "Admin User",
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel,
      module: input.module,
      details: JSON.stringify(input.details ?? {}),
      ip: "10.0.0.1",
      createdAt: new Date(),
    })
    .run();
}
