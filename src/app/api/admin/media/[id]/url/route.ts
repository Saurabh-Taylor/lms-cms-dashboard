import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/media/[id]/url">("/api/v1/admin/media/[id]/url", PERM.mediaView);
