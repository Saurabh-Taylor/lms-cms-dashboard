import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/media/[id]/complete">("/api/v1/admin/media/[id]/complete", PERM.mediaUpload);
