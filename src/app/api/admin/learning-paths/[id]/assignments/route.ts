import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/learning-paths/[id]/assignments">("/api/v1/admin/learning-paths/[id]/assignments", PERM.courseView);
export const POST = proxy<"/api/admin/learning-paths/[id]/assignments">("/api/v1/admin/learning-paths/[id]/assignments", PERM.pathAssign);
