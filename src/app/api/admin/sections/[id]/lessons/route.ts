import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/sections/[id]/lessons">(
  "/api/v1/admin/sections/[id]/lessons",
  PERM.courseUpdate,
);
