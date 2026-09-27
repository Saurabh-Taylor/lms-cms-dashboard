// Permission vocabulary — mirrors the backend RBAC matrix (rbac.ts in the
// NestJS API is the source of truth). Typing the keys turns a typo'd gate
// into a compile error instead of a silent 403 for everyone.

export const PERM = {
  activityView: "activity:view",
  adminView: "admin:view",
  analyticsView: "analytics:view",
  announcementCreate: "announcement:create",
  announcementView: "announcement:view",
  assessmentCreate: "assessment:create",
  assessmentUpdate: "assessment:update",
  assessmentView: "assessment:view",
  auditView: "audit:view",
  certificateIssue: "certificate:issue",
  certificateView: "certificate:view",
  courseCreate: "course:create",
  courseDelete: "course:delete",
  coursePublish: "course:publish",
  courseUpdate: "course:update",
  courseView: "course:view",
  enrollmentCreate: "enrollment:create",
  enrollmentUpdate: "enrollment:update",
  enrollmentView: "enrollment:view",
  learnerCreate: "learner:create",
  learnerSuspend: "learner:suspend",
  learnerUpdate: "learner:update",
  learnerView: "learner:view",
  learningProgress: "learning:progress",
  learningView: "learning:view",
  settingsUpdate: "settings:update",
  settingsView: "settings:view",
} as const;

export type Perm = (typeof PERM)[keyof typeof PERM];
