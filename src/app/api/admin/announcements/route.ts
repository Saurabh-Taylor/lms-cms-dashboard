import { proxy } from "@/lib/api/proxy";
import { PERM } from "@/lib/permissions";

export const GET = proxy<"/api/admin/announcements">("/api/v1/admin/announcements", PERM.announcementView);
export const POST = proxy<"/api/admin/announcements">("/api/v1/admin/announcements", PERM.announcementCreate);
