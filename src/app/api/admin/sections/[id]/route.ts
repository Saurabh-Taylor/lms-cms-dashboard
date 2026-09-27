import { verb } from "@/lib/api/verb";
import { write } from "@/lib/admin/sections";
import { PERM } from "@/lib/permissions";

export const PATCH = verb<"/api/admin/sections/[id]">(PERM.courseUpdate, write.update);
export const DELETE = verb<"/api/admin/sections/[id]">(PERM.courseUpdate, write.remove);
