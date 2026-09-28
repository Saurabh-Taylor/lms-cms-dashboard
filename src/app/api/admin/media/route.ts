import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/media">(
  "/api/v1/admin/media",
  PERM.courseView,
);
