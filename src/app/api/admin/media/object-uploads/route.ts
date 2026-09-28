import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const POST = proxy<"/api/admin/media/object-uploads">("/api/v1/admin/media/object-uploads", PERM.mediaUpload);
