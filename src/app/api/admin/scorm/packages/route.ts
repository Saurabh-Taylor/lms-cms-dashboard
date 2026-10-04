import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/scorm/packages">(
  "/api/v1/admin/scorm/packages",
  PERM.courseView,
);
export const POST = proxy<"/api/admin/scorm/packages">(
  "/api/v1/admin/scorm/packages",
  PERM.mediaUpload,
);
