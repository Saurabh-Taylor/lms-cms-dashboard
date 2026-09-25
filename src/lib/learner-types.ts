// DTO shapes returned by /api/learner/* routes.
import type { OptionItem, SectionNode } from "@/lib/types";

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
  sections: SectionNode[];
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

export interface LearnerAnnouncement {
  id: number;
  title: string;
  body: string;
  createdAt: number;
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
