import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/courses";
import { PERM } from "@/lib/permissions";

export const POST = verb<"/api/admin/courses/[id]/duplicate">(
  PERM.courseCreate,
  write.duplicate,
  { status: 201 }
);
