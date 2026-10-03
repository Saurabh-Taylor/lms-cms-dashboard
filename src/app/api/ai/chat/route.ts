import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

// Mirrors the backend's route-scoped bodyLimit — reject declared-oversized
// transcripts before proxy() buffers them in the BFF process.
export const POST = proxy<"/api/ai/chat">("/api/v1/ai/chat", requireAdmin, {
  maxBodyBytes: 512 * 1024,
});

// Thread hydrate (#93) — the persistence:true client GETs the same path
// (?threadId&limit&before) on mount.
export const GET = proxy<"/api/ai/chat">("/api/v1/ai/chat", requireAdmin);
