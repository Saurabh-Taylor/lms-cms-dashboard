import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const DELETE = proxy<"/api/admin/learning-paths/[id]/assignments/[assignmentId]">("/api/v1/admin/learning-paths/[id]/assignments/[assignmentId]", PERM.pathAssign);
