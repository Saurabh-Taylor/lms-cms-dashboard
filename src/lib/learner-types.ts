// DTO shapes returned by /api/learner/* routes.
import type { LessonNode, OptionItem } from "@/lib/types";

export interface LearnerEnrollmentInfo {
  id: number;
  status: "active" | "completed" | "expired" | "suspended";
  progress: number;
  enrolledAt: number;
  expiresAt: number | null;
  completedAt: number | null;
}

export interface LearnerCourse {
  id: number;
  title: string;
  description: string | null;
  difficulty: string;
  thumbnailColor: string;
  estimatedMinutes: number;
  lessonCount: number;
  instructorName: string | null;
  categoryName: string | null;
  enrollment: LearnerEnrollmentInfo;
  /** latest learning activity timestamp — drives "continue learning" ordering */
  lastActivityAt: number | null;
}

export interface LearnerLesson extends LessonNode {
  /** epoch ms when this learner completed the lesson, or null */
  completedAt: number | null;
}

export interface LearnerSection {
  id: number;
  courseId: number;
  title: string;
  position: number;
  lessons: LearnerLesson[];
}

/** Catalog card — a published+public course; `enrollment` is the caller's own row or null. */
export interface LearnerCatalogCourse {
  id: number;
  title: string;
  description: string | null;
  difficulty: string;
  thumbnailColor: string;
  estimatedMinutes: number;
  lessonCount: number;
  enrollmentCount: number;
  instructorName: string | null;
  categoryName: string | null;
  enrollment: LearnerEnrollmentInfo | null;
}

export interface LearnerCourseDetail {
  course: {
    id: number;
    title: string;
    description: string | null;
    difficulty: string;
    thumbnailColor: string;
    estimatedMinutes: number;
    instructorName: string | null;
    categoryName: string | null;
  };
  enrollment: LearnerEnrollmentInfo;
  sections: LearnerSection[];
}

export interface LearnerAssessment {
  id: number;
  title: string;
  kind: "quiz" | "exam" | "assignment";
  courseId: number | null;
  courseTitle: string | null;
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  timeLimitMin: number;
  showResults: boolean;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  lastSubmittedAt: number | null;
}

export interface LearnerCertificate {
  id: number;
  serial: string;
  courseId: number;
  courseTitle: string;
  issuedAt: number;
}

export interface LearnerQuestion {
  id: number;
  prompt: string;
  type: "single" | "multi" | "tf";
  options: string[];
  points: number;
}

export interface LearnerAttemptStart {
  resumed: boolean;
  attemptId: number;
  attemptNo: number;
  /** epoch ms — server-enforced deadline */
  deadline: number;
  questions: LearnerQuestion[];
}

export interface LearnerAssessmentDetail {
  assessment: {
    id: number;
    title: string;
    kind: string;
    courseId: number | null;
    courseTitle: string | null;
    questionCount: number;
    passingScore: number;
    maxAttempts: number;
    timeLimitMin: number;
    showResults: boolean;
  };
  attempts: {
    id: number;
    attemptNo: number;
    status: "in_progress" | "submitted" | "expired";
    score: number | null;
    passed: boolean;
    submittedAt: number | null;
    /** assignment-kind: submitted but not yet graded */
    pendingGrade: boolean;
  }[];
  activeAttemptId: number | null;
  canAttempt: boolean;
  attemptsUsed: number;
}

export interface AttemptResultReview {
  questionId: number;
  prompt: string;
  options: string[];
  correct: number[];
  selected: number[];
  pointsEarned: number;
}

export interface LearnerAttemptResult {
  attemptId: number;
  attemptNo: number;
  status: "in_progress" | "submitted" | "expired";
  score: number;
  passed: boolean;
  passingScore: number;
  submittedAt: number | null;
  showResults: boolean;
  review: AttemptResultReview[] | null;
  /** present when status === "in_progress" (resume payload) */
  deadline?: number;
  questions?: LearnerQuestion[];
  /** assignment-kind fields */
  submission?: string | null;
  feedback?: string | null;
  gradedAt?: number | null;
  /** submitted but awaiting a grade (assignments) */
  pendingGrade?: boolean;
}

export interface LearnerAnnouncement {
  id: number;
  title: string;
  body: string;
  /** ms epoch from legacy SQLite rows; ISO string from backend endpoints. */
  createdAt: number | string;
}

export interface LearnerDashboard {
  stats: {
    enrolled: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
    certificates: number;
  };
  continueLearning: LearnerCourse[];
  dueSoon: { id: number; title: string; expiresAt: number; href: string }[];
  announcements: LearnerAnnouncement[];
}

export interface LearnerSearchResults {
  courses: OptionItem[];
  assessments: OptionItem[];
}
