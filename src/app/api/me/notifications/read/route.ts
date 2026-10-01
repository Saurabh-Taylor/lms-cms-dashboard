import { proxy } from "@/lib/api/proxy";
import { requireAuthed } from "@/lib/me";


export const POST = proxy<"/api/me/notifications/read">("/api/v1/me/notifications/read", requireAuthed);
