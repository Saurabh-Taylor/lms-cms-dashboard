import { proxy } from "@/lib/api/proxy";
import { requireLearner } from "@/lib/me";

export const GET = proxy<"/api/learner/certificates">(
  "/api/v1/learner/certificates",
  requireLearner,
);
