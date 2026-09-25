// RBAC model — resource:action permissions per role.
// Server routes and UI both consult `can()`. Wire to auth when available.

export type Permission =
  | "course:view" | "course:create" | "course:update" | "course:delete" | "course:publish"
  | "learner:view" | "learner:update" | "learner:suspend"
  | "enrollment:view" | "enrollment:create" | "enrollment:update"
  | "assessment:view" | "assessment:create" | "assessment:update"
  | "certificate:view" | "certificate:issue"
  | "announcement:view" | "announcement:create"
  | "analytics:view" | "activity:view" | "audit:view"
  | "admin:view" | "settings:view" | "settings:update";

export type AppRole = "super_admin" | "admin" | "instructor" | "content_manager" | "support";

const ALL: Permission[] = [
  "course:view", "course:create", "course:update", "course:delete", "course:publish",
  "learner:view", "learner:update", "learner:suspend",
  "enrollment:view", "enrollment:create", "enrollment:update",
  "assessment:view", "assessment:create", "assessment:update",
  "certificate:view", "certificate:issue",
  "announcement:view", "announcement:create",
  "analytics:view", "activity:view", "audit:view",
  "admin:view", "settings:view", "settings:update",
];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== "settings:update"),
  instructor: [
    "course:view", "course:update", "learner:view",
    "assessment:view", "assessment:create", "assessment:update",
    "certificate:view", "analytics:view",
  ],
  content_manager: [
    "course:view", "course:create", "course:update", "course:publish",
    "assessment:view", "announcement:view", "announcement:create",
  ],
  support: ["learner:view", "enrollment:view", "activity:view", "certificate:view"],
};

export function can(role: AppRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Demo role — swap for session-derived role when auth lands. */
export const CURRENT_ROLE: AppRole = "super_admin";
