import { headers } from "next/headers";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import type { Runner } from "@/lib/db/aggregates";
import type { Actor } from "@/lib/domain";
import type { SessionUser } from "@/lib/me";

export interface AuditEvent {
  action: string;
  targetType: string;
  targetId?: number | null;
  targetLabel: string;
  module: string;
  details?: Record<string, unknown>;
}

/** Client IP for audit rows — async; call BEFORE opening the (sync) tx. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** In-transaction audit write — domain ops emit this as the LAST tx statement
 *  so a rolled-back op leaves no audit row. `ip` comes from clientIp() pre-tx. */
export function auditTx(
  runner: Runner,
  actor: Actor,
  e: AuditEvent,
  ip?: string | null
) {
  runner.run(sql`INSERT INTO audit_logs
    (actor_id, actor_name, action, target_type, target_id, target_label, module, details, ip, created_at)
    VALUES (${actor.id}, ${actor.name || actor.email}, ${e.action}, ${e.targetType},
      ${e.targetId ?? null}, ${e.targetLabel}, ${e.module},
      ${JSON.stringify(e.details ?? {})}, ${ip ?? null}, ${Date.now()})`);
}

/** Writes a human-readable audit entry for an admin action — post-commit
 *  variant for non-tx callers (export). Mutations use auditTx inside the op. */
export async function audit(
  actor: SessionUser,
  input: AuditEvent,
) {
  db.insert(auditLogs)
    .values({
      actorId: actor.id,
      actorName: actor.name || actor.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel,
      module: input.module,
      details: JSON.stringify(input.details ?? {}),
      ip: await clientIp(),
      createdAt: new Date(),
    })
    .run();
}
