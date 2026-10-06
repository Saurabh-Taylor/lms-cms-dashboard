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
  me: ["/api/admin/me"] as const,
  // admin lists
  analytics: ["/api/admin/analytics"] as const,
  announcements: ["/api/admin/announcements"] as const,
  assessments: ["/api/admin/assessments"] as const,
  attempts: ["/api/admin/attempts"] as const,
  categories: ["/api/admin/categories"] as const,
  certificates: ["/api/admin/certificates"] as const,
  courses: ["/api/admin/courses"] as const,
  enrollments: ["/api/admin/enrollments"] as const,
  groups: ["/api/admin/groups"] as const,
  learningPaths: ["/api/admin/learning-paths"] as const,
  media: ["/api/admin/media"] as const,
  rbac: ["/api/admin/rbac"] as const,
  settings: ["/api/admin/settings"] as const,
  smtpSettings: ["/api/admin/settings/smtp"] as const,
  ssoProviders: ["/api/admin/sso-providers"] as const,
  users: ["/api/admin/users"] as const,
  // learner reads
  learnerAssessments: ["/api/learner/assessments"] as const,
  learnerCatalog: ["/api/learner/catalog"] as const,
  learnerCertificates: ["/api/learner/certificates"] as const,
  learnerCourses: ["/api/learner/courses"] as const,
  learnerDashboard: ["/api/learner/dashboard"] as const,
  learnerSearch: ["/api/learner/search"] as const,
  // entity keys — detail reads, never list prefixes
  assessmentQuestions: (id: number) => [`/api/admin/assessments/${id}/questions`] as const,
  course: (id: number) => ["course", id] as const,
  groupMembers: (groupId: number) => ["group-members", groupId] as const,
  pathAssignments: (pathId: number) => ["path-assignments", pathId] as const,
  // semantic non-endpoint keys that are invalidation targets
  mediaQuota: ["media-quota"] as const,
};
