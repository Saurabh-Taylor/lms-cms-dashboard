import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ---------- Users ----------
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role", { enum: ["learner", "instructor", "admin"] })
      .notNull()
      .default("learner"),
    status: text("status", { enum: ["active", "suspended", "invited"] })
      .notNull()
      .default("active"),
    title: text("title"),
    // denormalized aggregates kept in sync by mutations (mirrors prod strategy)
    enrolledCount: integer("enrolled_count").notNull().default(0),
    labsCount: integer("labs_count").notNull().default(0),
    avgProgress: integer("avg_progress").notNull().default(0),
    lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("users_role_idx").on(t.role),
    index("users_status_idx").on(t.status),
    index("users_last_active_idx").on(t.lastActiveAt),
    index("users_created_idx").on(t.createdAt),
  ]
);

// ---------- Taxonomy ----------
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("group_members_uniq").on(t.groupId, t.userId), index("group_members_user_idx").on(t.userId)]
);

// ---------- Courses ----------
export const courses = sqliteTable(
  "courses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    instructorId: integer("instructor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    difficulty: text("difficulty", {
      enum: ["beginner", "intermediate", "advanced"],
    })
      .notNull()
      .default("beginner"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    visibility: text("visibility", {
      enum: ["public", "private", "unlisted"],
    })
      .notNull()
      .default("public"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(0),
    tags: text("tags").notNull().default("[]"), // JSON array
    thumbnailColor: text("thumbnail_color").notNull().default("#6366f1"),
    certificateEnabled: integer("certificate_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    // denormalized aggregates
    enrollmentCount: integer("enrollment_count").notNull().default(0),
    completionRate: integer("completion_rate").notNull().default(0), // 0-100
    avgProgress: integer("avg_progress").notNull().default(0),
    lessonCount: integer("lesson_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("courses_status_idx").on(t.status),
    index("courses_category_idx").on(t.categoryId),
    index("courses_instructor_idx").on(t.instructorId),
    index("courses_updated_idx").on(t.updatedAt),
  ]
);

export const sections = sqliteTable(
  "sections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("sections_course_idx").on(t.courseId, t.position)]
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type", {
      enum: ["text", "video", "pdf", "link", "code", "quiz", "lab", "assignment"],
    })
      .notNull()
      .default("text"),
    durationMin: integer("duration_min").notNull().default(10),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    position: integer("position").notNull(),
    blocks: text("blocks").notNull().default("[]"), // JSON content blocks
  },
  (t) => [index("lessons_section_idx").on(t.sectionId, t.position)]
);

// ---------- Enrollments & progress ----------
export const enrollments = sqliteTable(
  "enrollments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["active", "completed", "expired", "suspended"],
    })
      .notNull()
      .default("active"),
    progress: integer("progress").notNull().default(0),
    enrolledAt: integer("enrolled_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("enrollments_uniq").on(t.userId, t.courseId),
    index("enrollments_course_idx").on(t.courseId),
    index("enrollments_status_idx").on(t.status),
    index("enrollments_enrolled_idx").on(t.enrolledAt),
  ]
);

// ---------- Labs ----------
export const labs = sqliteTable(
  "labs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["vm", "container", "jupyter", "cloud-sandbox"],
    })
      .notNull()
      .default("container"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    durationMin: integer("duration_min").notNull().default(60),
    resourceTier: text("resource_tier", {
      enum: ["small", "medium", "large"],
    })
      .notNull()
      .default("small"),
    status: text("status", { enum: ["active", "disabled", "archived"] })
      .notNull()
      .default("active"),
    assignedCount: integer("assigned_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("labs_status_idx").on(t.status)]
);

export const labAssignments = sqliteTable(
  "lab_assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    labId: integer("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["assigned", "running", "completed", "expired"],
    })
      .notNull()
      .default("assigned"),
    assignedAt: integer("assigned_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("lab_assign_uniq").on(t.labId, t.userId),
    index("lab_assign_user_idx").on(t.userId),
  ]
);

// ---------- Assessments ----------
export const assessments = sqliteTable(
  "assessments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    courseId: integer("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["quiz", "exam", "assignment"] })
      .notNull()
      .default("quiz"),
    questionCount: integer("question_count").notNull().default(0),
    passingScore: integer("passing_score").notNull().default(70),
    maxAttempts: integer("max_attempts").notNull().default(1),
    timeLimitMin: integer("time_limit_min").notNull().default(30),
    shuffleQuestions: integer("shuffle_questions", { mode: "boolean" })
      .notNull()
      .default(false),
    showResults: integer("show_results", { mode: "boolean" })
      .notNull()
      .default(true),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("published"),
    attemptCount: integer("attempt_count").notNull().default(0),
    avgScore: integer("avg_score").notNull().default(0),
    passRate: integer("pass_rate").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("assessments_course_idx").on(t.courseId),
    index("assessments_kind_idx").on(t.kind),
  ]
);

export const assessmentAttempts = sqliteTable(
  "assessment_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    score: integer("score").notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("attempts_assessment_idx").on(t.assessmentId),
    index("attempts_user_idx").on(t.userId),
  ]
);

// ---------- Certificates ----------
export const certificates = sqliteTable(
  "certificates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serial: text("serial").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("certs_user_idx").on(t.userId),
    index("certs_course_idx").on(t.courseId),
  ]
);

// ---------- Communication ----------
export const announcements = sqliteTable("announcements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience", {
    enum: ["all", "learners", "instructors", "admins"],
  })
    .notNull()
    .default("all"),
  status: text("status", { enum: ["draft", "scheduled", "sent"] })
    .notNull()
    .default("draft"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const emailTemplates = sqliteTable("email_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["image", "video", "document", "archive"],
  }).notNull(),
  sizeKb: integer("size_kb").notNull(),
  uploadedById: integer("uploaded_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// ---------- Learning paths ----------
export const learningPaths = sqliteTable("learning_paths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  courseIds: text("course_ids").notNull().default("[]"), // ordered JSON ids
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// ---------- Activity & audit ----------
export const activityEvents = sqliteTable(
  "activity_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // login, course_opened, chapter_completed, ...
    courseId: integer("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    meta: text("meta").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("activity_user_idx").on(t.userId, t.createdAt),
    index("activity_type_idx").on(t.type),
    index("activity_course_idx").on(t.courseId),
    index("activity_created_idx").on(t.createdAt),
  ]
);

export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorId: integer("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(), // human readable verb phrase
    targetType: text("target_type").notNull(),
    targetId: integer("target_id"),
    targetLabel: text("target_label").notNull(),
    module: text("module").notNull(),
    details: text("details").notNull().default("{}"),
    ip: text("ip"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_module_idx").on(t.module),
    index("audit_actor_idx").on(t.actorId),
  ]
);
