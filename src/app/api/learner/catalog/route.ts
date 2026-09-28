import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const GET = proxy<"/api/learner/catalog">(
  "/api/v1/learner/catalog",
  requireLearner,
);
