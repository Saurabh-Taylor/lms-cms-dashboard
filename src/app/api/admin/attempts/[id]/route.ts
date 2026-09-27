import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/assessments";
import { PERM } from "@/lib/permissions";

export const PATCH = verb<"/api/admin/attempts/[id]">(
  PERM.assessmentUpdate,
  write.attempts.grade
);
