import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/courses/[id]/thumbnail-upload">(
  "/api/v1/admin/courses/[id]/thumbnail-upload",
  PERM.courseUpdate,
);
