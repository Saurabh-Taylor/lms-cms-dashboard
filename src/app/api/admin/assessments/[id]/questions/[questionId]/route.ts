import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/assessments";
import { PERM } from "@/lib/permissions";

export const PATCH = verb<"/api/admin/assessments/[id]/questions/[questionId]">(
  PERM.assessmentUpdate,
  write.questions.update
);

export const DELETE = verb<"/api/admin/assessments/[id]/questions/[questionId]">(
  PERM.assessmentUpdate,
  write.questions.remove
);
