import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const GET = proxy<"/api/learner/search">(
  "/api/v1/learner/search",
  requireLearner,
);
