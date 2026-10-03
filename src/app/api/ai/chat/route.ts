import { proxy } from "@/lib/api/proxy";
import { requireAdmin } from "@/lib/me";

// Mirrors the backend's route-scoped bodyLimit — reject declared-oversized
// transcripts before proxy() buffers them in the BFF process.
export const POST = proxy<"/api/ai/chat">("/api/v1/ai/chat", requireAdmin, {
  maxBodyBytes: 512 * 1024,
});
