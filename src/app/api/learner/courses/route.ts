import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const GET = proxy<"/api/learner/courses">(
  "/api/v1/learner/courses",
  requireLearner,
);
