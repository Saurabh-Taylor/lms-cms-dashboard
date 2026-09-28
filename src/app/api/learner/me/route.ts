import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const GET = proxy<"/api/learner/me">("/api/v1/learner/me", requireLearner);
export const PATCH = proxy<"/api/learner/me">("/api/v1/learner/me", requireLearner);
