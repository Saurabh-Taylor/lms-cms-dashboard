import { proxy } from "@/lib/api/proxy";
import { requireAuthed } from "@/lib/me";


export const POST = proxy<"/api/me/notifications/read-all">("/api/v1/me/notifications/read-all", requireAuthed);
