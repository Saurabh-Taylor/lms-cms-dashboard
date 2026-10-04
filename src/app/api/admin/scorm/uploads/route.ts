import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/scorm/uploads">(
  "/api/v1/admin/scorm/uploads",
  PERM.mediaUpload,
);
