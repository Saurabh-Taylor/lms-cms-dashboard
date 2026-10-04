/**
 * Shared TanStack Query keys for mutation invalidation — the list endpoints
 * key on the URL (`["/api/admin/courses", params]` → prefix match) and detail
 * queries key on `["<entity>", id]`.
 */
export const qk = {
  courses: ["/api/admin/courses"],
  course: (id: number) => ["course", id],
  enrollments: ["/api/admin/enrollments"],
  users: ["/api/admin/users"],
  pathAssignments: (pathId: number) => ["path-assignments", pathId],
};
