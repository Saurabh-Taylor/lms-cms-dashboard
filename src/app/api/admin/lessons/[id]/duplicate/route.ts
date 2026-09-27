import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/lessons";
import { PERM } from "@/lib/permissions";

export const POST = verb<"/api/admin/lessons/[id]/duplicate">(
  PERM.courseUpdate,
  write.duplicate,
  { status: 201 }
);
