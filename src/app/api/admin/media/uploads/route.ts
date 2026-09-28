import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/media/uploads">("/api/v1/admin/media/uploads", PERM.mediaUpload);
