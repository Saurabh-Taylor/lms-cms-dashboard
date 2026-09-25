// Learner-domain queries — every function is scoped to the authenticated
// learner's own rows. Admin data access paths stay in /api/admin/*.
import { and, desc, eq, inArray, like, max, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  announcements, assessmentAttempts, assessments, categories, certificates,
  courses, enrollments, lessons, sections, users,
  activityEvents,
} from "@/lib/db/schema";
import { likePattern } from "@/lib/api/helpers";
import type {
  LearnerAnnouncement, LearnerAssessment, LearnerCertificate,
  LearnerCourse, LearnerCourseDetail,
} from "@/lib/learner-types";

const courseCols = {
  id: courses.id,
  title: courses.title,
  description: courses.description,
  difficulty: courses.difficulty,
  thumbnailColor: courses.thumbnailColor,
  estimatedMinutes: courses.estimatedMinutes,
  lessonCount: courses.lessonCount,
  instructorName: users.name,
  categoryName: categories.name,
};

const enrollmentCols = {
  id: enrollments.id,
  status: enrollments.status,
  progress: enrollments.progress,
  enrolledAt: enrollments.enrolledAt,
  expiresAt: enrollments.expiresAt,
  completedAt: enrollments.completedAt,
};

// drizzle timestamp_ms returns Date; DTOs expose epoch ms
const ms = (d: Date | null | undefined) => (d ? d.getTime() : null);
const msReq = (d: Date) => d.getTime();

type EnrollmentRow = {
  id: number;
  status: "active" | "completed" | "expired" | "suspended";
  progress: number;
  enrolledAt: Date;
  expiresAt: Date | null;
  completedAt: Date | null;
};

function mapEnrollment(e: EnrollmentRow) {
  return {
    id: e.id,
    status: e.status,
    progress: e.progress,
    enrolledAt: msReq(e.enrolledAt),
    expiresAt: ms(e.expiresAt),
    completedAt: ms(e.completedAt),
  };
}

/** Latest activity timestamp per course for a learner — continue-learning order. */
function lastActivityByCourse(userId: number): Map<number, number> {
  const rows = db
    .select({ courseId: activityEvents.courseId, last: max(activityEvents.createdAt) })
    .from(activityEvents)
    .where(eq(activityEvents.userId, userId))
    .groupBy(activityEvents.courseId)
    .all();
  const m = new Map<number, number>();
  for (const r of rows) if (r.courseId != null && r.last != null) m.set(r.courseId, Number(r.last));
  return m;
}

/** All enrollments for the learner, joined to course + instructor + category. */
export function listMyCourses(userId: number): LearnerCourse[] {
  const rows = db
    .select({ ...courseCols, enrollment: enrollmentCols })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt))
    .all();

  const activity = lastActivityByCourse(userId);
  return rows.map((r) => ({
    ...r,
    enrollment: mapEnrollment(r.enrollment),
    lastActivityAt: activity.get(r.id) ?? null,
  }));
}

export function getCourseDetail(userId: number, courseId: number): LearnerCourseDetail | null {
  const row = db
    .select({ ...courseCols, enrollment: enrollmentCols })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(categories, eq(courses.categoryId, categories.id))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .all()[0];
  if (!row) return null;

  const secs = db
    .select()
    .from(sections)
    .where(eq(sections.courseId, courseId))
    .orderBy(sections.position)
    .all();
  const lessonRows = db
    .select()
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .where(and(eq(sections.courseId, courseId), eq(lessons.status, "published")))
    .orderBy(lessons.position)
    .all();

  const bySection = new Map<number, typeof lessonRows>();
  for (const l of lessonRows) {
    const arr = bySection.get(l.lessons.sectionId) ?? [];
    arr.push(l);
    bySection.set(l.lessons.sectionId, arr);
  }

  return {
    course: { ...row },
    enrollment: mapEnrollment(row.enrollment),
    sections: secs
      .map((s) => ({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        position: s.position,
        lessons: (bySection.get(s.id) ?? []).map((l) => l.lessons),
      }))
      .filter((s) => s.lessons.length > 0),
  };
}

/** Ids of courses the learner is enrolled in — gates assessment visibility. */
function myCourseIds(userId: number): number[] {
  return db
    .select({ id: enrollments.courseId })
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .all()
    .map((r) => r.id);
}

export function listMyAssessments(
  userId: number,
  kind: "tasks" | "quizzes" = "quizzes"
): LearnerAssessment[] {
  const courseIds = myCourseIds(userId);
  if (!courseIds.length) return [];

  const kinds = kind === "tasks" ? ["assignment"] : ["quiz", "exam"];
  const rows = db
    .select({
      id: assessments.id,
      title: assessments.title,
      kind: assessments.kind,
      courseId: assessments.courseId,
      courseTitle: courses.title,
      questionCount: assessments.questionCount,
      passingScore: assessments.passingScore,
      maxAttempts: assessments.maxAttempts,
      timeLimitMin: assessments.timeLimitMin,
      showResults: assessments.showResults,
    })
    .from(assessments)
    .leftJoin(courses, eq(assessments.courseId, courses.id))
    .where(
      and(
        inArray(assessments.courseId, courseIds),
        inArray(assessments.kind, kinds as ("quiz" | "exam" | "assignment")[]),
        eq(assessments.status, "published")
      )
    )
    .orderBy(desc(assessments.createdAt))
    .all();
  if (!rows.length) return [];

  const attempts = db
    .select({
      assessmentId: assessmentAttempts.assessmentId,
      used: sql<number>`count(*)`,
      best: sql<number | null>`max(${assessmentAttempts.score})`,
      passed: sql<number>`max(${assessmentAttempts.passed})`,
      last: max(assessmentAttempts.submittedAt),
    })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.userId, userId),
        inArray(assessmentAttempts.assessmentId, rows.map((r) => r.id))
      )
    )
    .groupBy(assessmentAttempts.assessmentId)
    .all();
  const byId = new Map(attempts.map((a) => [a.assessmentId, a]));

  return rows.map((r) => {
    const a = byId.get(r.id);
    return {
      ...r,
      attemptsUsed: a?.used ?? 0,
      bestScore: a?.best ?? null,
      passed: Boolean(a?.passed),
      lastSubmittedAt: a?.last ? Number(a.last) : null,
    };
  });
}

export function listMyCertificates(userId: number): LearnerCertificate[] {
  return db
    .select({
      id: certificates.id,
      serial: certificates.serial,
      courseId: certificates.courseId,
      courseTitle: courses.title,
      issuedAt: certificates.issuedAt,
    })
    .from(certificates)
    .innerJoin(courses, eq(certificates.courseId, courses.id))
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt))
    .all()
    .map((r) => ({ ...r, issuedAt: msReq(r.issuedAt) }));
}

/** Learner-visible announcements: sent, audience "all" or matching the role. */
export function listMyAnnouncements(role: string): LearnerAnnouncement[] {
  const audience = role === "instructor" ? "instructors" : "learners";
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "sent"),
        inArray(announcements.audience, ["all", audience])
      )
    )
    .orderBy(desc(announcements.createdAt))
    .limit(50)
    .all()
    .map((r) => ({ ...r, createdAt: msReq(r.createdAt) }));
}

export function learnerDashboard(userId: number, role: string) {
  const myCourses = listMyCourses(userId);
  const myCerts = listMyCertificates(userId);

  const stats = {
    enrolled: myCourses.length,
    inProgress: myCourses.filter((c) => c.enrollment.status === "active").length,
    completed: myCourses.filter((c) => c.enrollment.status === "completed").length,
    avgProgress: myCourses.length
      ? Math.round(myCourses.reduce((s, c) => s + c.enrollment.progress, 0) / myCourses.length)
      : 0,
    certificates: myCerts.length,
  };

  const continueLearning = myCourses
    .filter((c) => c.enrollment.status === "active")
    .sort((a, b) => (b.lastActivityAt ?? a.enrollment.enrolledAt) - (a.lastActivityAt ?? a.enrollment.enrolledAt))
    .slice(0, 4);

  const now = Date.now();
  const dueSoon = myCourses
    .filter((c) => c.enrollment.expiresAt && c.enrollment.expiresAt > now && c.enrollment.status === "active")
    .map((c) => ({ id: c.id, title: c.title, expiresAt: c.enrollment.expiresAt!, href: `/learner/courses/${c.id}` }))
    .sort((a, b) => a.expiresAt - b.expiresAt)
    .slice(0, 6);

  return { stats, continueLearning, dueSoon, announcements: listMyAnnouncements(role).slice(0, 3) };
}

/** Learner-scoped search — enrolled courses and visible assessments. */
export function learnerSearch(userId: number, q: string) {
  const p = likePattern(q);
  const courseIds = myCourseIds(userId);
  const myCourses = courseIds.length
    ? db
        .select({ id: courses.id, label: courses.title, sub: categories.name })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .leftJoin(categories, eq(courses.categoryId, categories.id))
        .where(and(eq(enrollments.userId, userId), like(courses.title, p)))
        .limit(5)
        .all()
    : [];
  const myAssessments = courseIds.length
    ? db
        .select({ id: assessments.id, label: assessments.title, sub: assessments.kind })
        .from(assessments)
        .where(
          and(
            inArray(assessments.courseId, courseIds),
            eq(assessments.status, "published"),
            like(assessments.title, p)
          )
        )
        .limit(5)
        .all()
    : [];
  return { courses: myCourses, assessments: myAssessments };
}
