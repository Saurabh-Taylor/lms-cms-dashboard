// DTO shapes returned by /api/admin/* routes.

import type { AppRole, LessonBlock as LessonBlockWrite, UserStatus } from "@microshala/contracts";

export type { UserStatus };

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CourseStatus = "draft" | "published" | "archived";
export type Role = "learner" | "instructor" | "admin";

export interface CourseRow {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  instructorId: number | null;
  instructorName: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  status: CourseStatus;
  visibility: "public" | "private" | "unlisted";
  estimatedMinutes: number;
  tags: string[];
  thumbnailColor: string;
  thumbnailUrl: string | null;
  certificateEnabled: boolean;
  enrollmentCount: number;
  completionRate: number;
  avgProgress: number;
  lessonCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  appRole: AppRole;
  status: UserStatus;
  title: string | null;
  enrolledCount: number;
  avgProgress: number;
  lastActiveAt: number | string | null;
  createdAt: number | string;
}

export interface SectionNode {
  id: number;
  courseId: number;
  title: string;
  position: number;
  lessons: LessonNode[];
}

export interface LessonNode {
  id: number;
  sectionId: number;
  title: string;
  type: string;
  durationMin: number;
  status: string;
  position: number;
  blocks: LessonBlock[];
}

/**
 * Lesson content block — Postgres jsonb, served as a real array.
 * Write shape comes from @microshala/contracts (LessonBlockSchema); the fields
 * below are resolved server-side at read time on learner routes — never raw
 * storage keys. mediaStatus null = linked asset gone.
 */
export interface LessonBlock extends LessonBlockWrite {
  embedUrl?: string | null;
  mediaStatus?: string | null;
  /** r2-backed assets — drives viewer-vs-download rendering */
  mime?: string | null;
  /** source pixel dims of the linked asset — sizes the player container */
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  language?: string;
  refId?: number;
}

export interface EnrollmentRow {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  courseId: number;
  courseTitle: string;
  status: "active" | "completed" | "expired" | "suspended";
  progress: number;
  enrolledAt: number;
  expiresAt: number | null;
  completedAt: number | null;
}

export interface AssessmentRow {
  id: number;
  courseId: number | null;
  courseTitle: string | null;
  title: string;
  kind: "quiz" | "exam" | "assignment";
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  timeLimitMin: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  status: CourseStatus;
  attemptCount: number;
  avgScore: number;
  passRate: number;
  createdAt: number;
}

export interface CertificateRow {
  id: number;
  serial: string;
  userId: number;
  userName: string;
  courseId: number;
  courseTitle: string;
  issuedAt: number;
  revokedAt: number | null;
}

export interface AnnouncementRow {
  id: number;
  title: string;
  body: string;
  audience: string;
  status: "draft" | "scheduled" | "sent";
  scheduledAt: number | null;
  sentAt: number | null;
  createdAt: number;
}

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  courseCount: number;
  createdAt: number;
}

export interface GroupRow {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: number;
}

export interface LearningPathRow {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  status: CourseStatus;
  courseIds: number[];
  courseCount: number;
  createdAt: number;
}

export interface MediaRow {
  id: number;
  name: string;
  type: "image" | "video" | "document" | "archive";
  sizeKb: number;
  source: "vimeo" | "external" | "r2";
  status: "uploading" | "processing" | "ready" | "error";
  /** Vimeo rows: "/videos/{id}"; r2 rows: object key; external rows: null */
  storageKey: string | null;
  /** r2 rows: server-derived MIME — drives preview + learner rendering */
  mime?: string | null;
  /** external-link rows only */
  url: string | null;
  /** player.vimeo.com embed for ready vimeo rows — derived server-side */
  embedUrl?: string | null;
  durationSec?: number | null;
  uploadedByName: string | null;
  createdAt: number | string;
}

export interface EmailTemplateRow {
  id: number;
  name: string;
  subject: string;
  body: string;
  updatedAt: Date | string;
}

export interface ActivityRow {
  id: number;
  userId: number;
  userName: string;
  type: string;
  courseId: number | null;
  courseTitle: string | null;
  meta: { device?: string } & Record<string, unknown>;
  createdAt: number | string;
}

export interface AuditRow {
  id: number;
  actorId: number | null;
  actorName: string;
  action: string;
  targetType: string;
  targetId: number | null;
  targetLabel: string;
  module: string;
  details: Record<string, unknown>;
  ip: string | null;
  createdAt: number | string;
}

export interface OptionItem {
  id: number;
  label: string;
  sub?: string;
}

export interface EnrollmentSeriesPoint {
  date: string;
  count: number;
}

export interface DashboardStats {
  totals: {
    learners: number;
    activeLearners: number;
    courses: number;
    publishedCourses: number;
    enrollments: number;
    completionRate: number;
    certificates: number;
  };
  coursePerformance: {
    id: number;
    title: string;
    status: string;
    enrollmentCount: number;
    completionRate: number;
    avgProgress: number;
  }[];
  recentActivity: {
    id: number;
    userName: string;
    type: string;
    courseId: number | null;
    courseTitle: string | null;
    createdAt: number;
  }[];
}

export interface SearchResults {
  learners: OptionItem[];
  courses: OptionItem[];
  assessments: OptionItem[];
}

/** GET /admin/sso-providers row — secrets never reach the wire (backend whitelist). */
export interface SsoProvider {
  providerId: string;
  type: "oidc" | "saml";
  issuer: string;
  domain: string;
  /** Customer-IdP-admin setup URLs emitted by the backend. */
  spMetadataUrl: string;
  acsUrl: string;
  oidcCallbackUrl: string;
}

/** GET /me/notifications item — union of personal notifications + announcements. */
export interface NotificationItem {
  /** Composite wire id: `n_<id>` personal, `a_<id>` announcement. */
  id: string;
  source: "notification" | "announcement";
  type: string;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  /** App-relative deep link; null when the target is gone (dead-link filtered). */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInbox {
  data: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  severityCounts: Record<"info" | "success" | "warning" | "error", number>;
  unreadCount: number;
}

/** GET /api/ai/models — slim OpenRouter catalog entry. */
export interface AiModel {
  id: string;
  name: string;
  contextLength: number | null;
  supportsTools: boolean;
}
