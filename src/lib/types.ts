// DTO shapes returned by /api/admin/* routes.

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type CourseStatus = "draft" | "published" | "archived";
export type UserStatus = "active" | "suspended" | "invited";
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
  tags: string; // JSON
  thumbnailColor: string;
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
  status: UserStatus;
  title: string | null;
  enrolledCount: number;
  labsCount: number;
  avgProgress: number;
  lastActiveAt: number | null;
  createdAt: number;
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
  blocks: string;
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

export interface LabRow {
  id: number;
  name: string;
  type: "vm" | "container" | "jupyter" | "cloud-sandbox";
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  durationMin: number;
  resourceTier: "small" | "medium" | "large";
  status: "active" | "disabled" | "archived";
  assignedCount: number;
  createdAt: number;
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
}

export interface AnnouncementRow {
  id: number;
  title: string;
  body: string;
  audience: string;
  status: "draft" | "scheduled" | "sent";
  scheduledAt: number | null;
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
  courseIds: string;
  courseCount: number;
  createdAt: number;
}

export interface MediaRow {
  id: number;
  name: string;
  type: "image" | "video" | "document" | "archive";
  sizeKb: number;
  uploadedByName: string | null;
  createdAt: number;
}

export interface EmailTemplateRow {
  id: number;
  name: string;
  subject: string;
  body: string;
  updatedAt: Date;
}

export interface ActivityRow {
  id: number;
  userId: number;
  userName: string;
  type: string;
  courseId: number | null;
  courseTitle: string | null;
  meta: string;
  createdAt: number;
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
  details: string;
  ip: string | null;
  createdAt: number;
}

export interface OptionItem {
  id: number;
  label: string;
  sub?: string;
}

export interface DashboardStats {
  totals: {
    learners: number;
    activeLearners: number;
    courses: number;
    publishedCourses: number;
    enrollments: number;
    completionRate: number;
    activeLabs: number;
    certificates: number;
  };
  enrollmentSeries: { date: string; count: number }[];
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
  labs: OptionItem[];
  assessments: OptionItem[];
}
