import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/sections";
import { PERM } from "@/lib/permissions";

export const POST = verb<"/api/admin/courses/[id]/sections">(PERM.courseUpdate, write.create, {
  status: 201,
});
