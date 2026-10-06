/**
 * Shared TanStack Query keys — the convention:
 *
 * - List/detail reads key on [endpoint, params] / [endpoint]; useList,
 *   useServerTable and useDetail build that from the endpoint arg themselves.
 * - An endpoint literal ("/api/…") NEVER appears inside a queryKey:/invalidate:
 *   in src/ — every family lives once here and callers reference qk.*.
 *   scripts/check-query-keys.ts enforces it (pnpm test).
 * - Entity keys stay entity-first (["course", id]) — a detail read must not
 *   prefix-match the whole list.
 * - Semantic non-endpoint keys (["options", …], ["notifications", …]) stay
 *   local — nothing invalidates them by literal. If one ever needs an
 *   invalidation target, it joins qk.
 * - invalidate: "all" remains the documented coarse option.
 */
export const qk = {
  me: ["/api/admin/me"],
  // admin lists
  analytics: ["/api/admin/analytics"],
  announcements: ["/api/admin/announcements"],
  assessments: ["/api/admin/assessments"],
  attempts: ["/api/admin/attempts"],
  categories: ["/api/admin/categories"],
  certificates: ["/api/admin/certificates"],
  courses: ["/api/admin/courses"],
  enrollments: ["/api/admin/enrollments"],
  groups: ["/api/admin/groups"],
  learningPaths: ["/api/admin/learning-paths"],
  media: ["/api/admin/media"],
  rbac: ["/api/admin/rbac"],
  settings: ["/api/admin/settings"],
  smtpSettings: ["/api/admin/settings/smtp"],
  ssoProviders: ["/api/admin/sso-providers"],
  users: ["/api/admin/users"],
  // learner reads
  learnerAssessments: ["/api/learner/assessments"],
  learnerCatalog: ["/api/learner/catalog"],
  learnerCertificates: ["/api/learner/certificates"],
  learnerCourses: ["/api/learner/courses"],
  learnerDashboard: ["/api/learner/dashboard"],
  learnerSearch: ["/api/learner/search"],
  // entity keys — detail reads, never list prefixes
  assessmentQuestions: (id: number) => [`/api/admin/assessments/${id}/questions`],
  course: (id: number) => ["course", id],
  pathAssignments: (pathId: number) => ["path-assignments", pathId],
};
