// Certificates write module — manual issuance is an admin OVERRIDE:
// `certificate_enabled` gates only automatic grants, not human intent.
// See lib/admin/lessons.ts for the module contract.
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { certificates, enrollments } from "@/lib/db/schema";
import { issueCertificate } from "@/lib/db/derived";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, type Actor } from "@/lib/domain";

export const create = z.object({
  userId: z.number().int().positive(),
  courseId: z.number().int().positive(),
});
export type CertificateIssue = z.infer<typeof create>;

async function issue(me: Actor, _params: Record<string, never>, input: CertificateIssue) {
  const ip = await clientIp();
  return db.transaction((tx) => {
    const enr = tx
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, input.userId), eq(enrollments.courseId, input.courseId)))
      .all()[0];
    if (!enr || enr.status !== "completed")
      throw new DomainError(409, "Learner has not completed this course");
    const cert = issueCertificate(tx, input);
    if (!cert) throw new DomainError(409, "Certificate already issued");
    const row = tx
      .select()
      .from(certificates)
      .where(and(eq(certificates.userId, input.userId), eq(certificates.courseId, input.courseId)))
      .all()[0];
    auditTx(tx, me, { action: "issued certificate", targetType: "certificate", targetId: row.id, targetLabel: cert.serial, module: "certificates" }, ip);
    return row;
  });
}

export const write = {
  create: { schema: create, run: issue },
};
