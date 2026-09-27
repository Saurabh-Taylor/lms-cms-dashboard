import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/lessons";
import { PERM } from "@/lib/permissions";

export const POST = verb<"/api/admin/sections/[id]/lessons">(PERM.courseUpdate, write.create, {
  status: 201,
});
