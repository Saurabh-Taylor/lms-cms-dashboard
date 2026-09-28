/**
 * Seed script: realistic LMS dataset.
 *   pnpm tsx scripts/seed.ts
 * Sizes: ~10k users, 320 courses, ~1.3k sections, ~7k lessons,
 *        ~60k enrollments, ~90k activity events, ~25k audit logs.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { faker } from "@faker-js/faker";
import path from "node:path";
import fs from "node:fs";
import * as s from "../src/lib/db/schema";
import { ASSESSMENT_COUNTERS_SET, COURSE_COUNTERS_SET, PROGRESS_EXPR, USER_COUNTERS_SET } from "../src/lib/db/aggregates";
import { sql, type InferInsertModel } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

faker.seed(42);

const DB_PATH = path.join(process.cwd(), "data", "lms.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.rmSync(DB_PATH, { force: true });
fs.rmSync(DB_PATH + "-wal", { force: true });
fs.rmSync(DB_PATH + "-shm", { force: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = OFF");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
const db = drizzle(sqlite, { schema: s });

const NOW = Date.now();
const DAY = 86_400_000;
const d = (msAgo: number) => new Date(NOW - msAgo);
// weighted "ago" — biased toward recent
const ago = (maxDays: number, bias = 1) =>
  Math.floor(Math.pow(faker.number.float({ min: 0, max: 1 }), bias) * maxDays * DAY);

function batch<T extends SQLiteTable>(table: T, rows: InferInsertModel<T>[], size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    db.insert(table).values(rows.slice(i, i + size)).run();
  }
}
const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

console.time("seed");
sqlite.transaction(() => {
  // ---------- categories ----------
  const catNames = [
    "Web Development", "Data Science", "DevOps", "Cloud", "Security",
    "Mobile", "AI & ML", "Databases", "Design", "Business",
    "Networking", "Programming", "IT Support", "Math",
  ];
  batch(s.categories, catNames.map((name) => ({
    name, slug: slugify(name), description: faker.lorem.sentence(),
    createdAt: d(ago(600)),
  })));

  // ---------- users ----------
  const users: InferInsertModel<typeof s.users>[] = [];
  for (let i = 0; i < 10_000; i++) {
    const role = i < 50 ? "admin" : i < 400 ? "instructor" : "learner";
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const created = ago(540, 0.8);
    users.push({
      name: `${first} ${last}`,
      email: `${slugify(first)}.${slugify(last)}${i}@example.com`,
      role,
      status: role === "admin" ? "active" : faker.helpers.weightedArrayElement([
        { value: "active" as const, weight: 88 },
        { value: "suspended" as const, weight: 4 },
        { value: "invited" as const, weight: 8 },
      ]),
      title: role !== "learner" ? faker.person.jobTitle() : null,
      lastActiveAt: d(ago(role === "learner" ? 45 : 10, 2)),
      createdAt: d(created),
    });
  }
  batch(s.users, users, 2000);
  const instructorIds = db.select({ id: s.users.id }).from(s.users)
    .where(sql`role = 'instructor'`).all().map((r) => r.id);
  const adminIds = db.select({ id: s.users.id }).from(s.users)
    .where(sql`role = 'admin'`).all().map((r) => r.id);
  console.log("users ✓");

  // ---------- groups/cohorts ----------
  batch(s.groups, Array.from({ length: 40 }, () => ({
    name: `${faker.company.buzzAdjective()} ${faker.date.month()} Cohort`.replace(/^./, (c) => c.toUpperCase()),
    description: faker.lorem.sentence(),
    createdAt: d(ago(400)),
  })));
  const memberships: InferInsertModel<typeof s.groupMembers>[] = [];
  const pairs = new Set<string>();
  for (let i = 0; i < 15_000; i++) {
    const g = faker.number.int({ min: 1, max: 40 });
    const u = faker.number.int({ min: 401, max: 10_000 });
    const k = `${g}:${u}`;
    if (pairs.has(k)) continue;
    pairs.add(k);
    memberships.push({ groupId: g, userId: u });
  }
  batch(s.groupMembers, memberships, 2000);
  console.log("groups ✓");

  // ---------- courses / sections / lessons ----------
  const adjectives = ["Complete", "Advanced", "Practical", "Modern", "Essential", "Mastering", "Introduction to", "Hands-On", "Professional", "Deep Dive into"];
  const topics = ["React", "Python", "Kubernetes", "SQL", "Machine Learning", "AWS", "Docker", "TypeScript", "Security Fundamentals", "Linux", "Node.js", "Data Engineering", "Figma", "Product Management", "Go", "Rust", "GraphQL", "Terraform", "Networking Basics", "System Design"];
  const courses: InferInsertModel<typeof s.courses>[] = [];
  const usedSlugs = new Set<string>();
  for (let i = 0; i < 320; i++) {
    const title = `${faker.helpers.arrayElement(adjectives)} ${faker.helpers.arrayElement(topics)} ${i > 250 ? faker.helpers.arrayElement(["II", "Bootcamp", "Masterclass", "2025"]) : ""}`.trim();
    let slug = slugify(title);
    while (usedSlugs.has(slug)) slug += `-${faker.number.int({ min: 2, max: 99 })}`;
    usedSlugs.add(slug);
    const status = faker.helpers.weightedArrayElement([
      { value: "published" as const, weight: 62 },
      { value: "draft" as const, weight: 26 },
      { value: "archived" as const, weight: 12 },
    ]);
    const created = ago(500, 0.9);
    courses.push({
      title, slug,
      description: faker.lorem.sentences(2),
      categoryId: faker.number.int({ min: 1, max: catNames.length }),
      instructorId: faker.helpers.arrayElement(instructorIds),
      difficulty: faker.helpers.arrayElement(["beginner", "intermediate", "advanced"] as const),
      status,
      visibility: faker.helpers.weightedArrayElement([
        { value: "public" as const, weight: 70 },
        { value: "unlisted" as const, weight: 18 },
        { value: "private" as const, weight: 12 },
      ]),
      estimatedMinutes: faker.number.int({ min: 60, max: 3600 }),
      tags: JSON.stringify(faker.helpers.arrayElements(topics, faker.number.int({ min: 1, max: 3 })).map(slugify)),
      thumbnailColor: faker.helpers.arrayElement(["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"]),
      certificateEnabled: status === "published" && faker.number.float() > 0.35,
      createdAt: d(created),
      updatedAt: d(ago(120, 1.4)),
    });
  }
  batch(s.courses, courses, 1000);

  const sectionRows: InferInsertModel<typeof s.sections>[] = [];
  const lessonRows: InferInsertModel<typeof s.lessons>[] = [];
  const lessonTypes = ["text", "video", "video", "text", "quiz", "lab", "pdf", "assignment", "code", "link"] as const;
  const blockKinds = ["text", "video", "code", "resource", "quiz", "lab", "image", "pdf", "link"];
  for (let c = 1; c <= 320; c++) {
    const nSec = faker.number.int({ min: 3, max: 6 });
    for (let si = 0; si < nSec; si++) {
      const sectionId = sectionRows.length + 1;
      sectionRows.push({ courseId: c, title: faker.helpers.arrayElement(["Getting Started", "Core Concepts", "Deep Dive", "Applied Practice", "Advanced Topics", "Capstone", "Review & Assessment"]) + (si > 0 ? ` ${si + 1}` : ""), position: si });
      const nLess = faker.number.int({ min: 3, max: 7 });
      for (let li = 0; li < nLess; li++) {
        const type = faker.helpers.arrayElement(lessonTypes);
        const nBlocks = faker.number.int({ min: 1, max: 4 });
        lessonRows.push({
          sectionId, title: faker.lorem.words({ min: 2, max: 5 }).replace(/^./, (ch) => ch.toUpperCase()),
          type,
          durationMin: faker.number.int({ min: 5, max: 90 }),
          status: faker.number.float() > 0.12 ? "published" : "draft",
          position: li,
          blocks: JSON.stringify(Array.from({ length: nBlocks }, (_, bi) => ({
            id: `b${bi + 1}`,
            type: faker.helpers.arrayElement(blockKinds),
            text: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
          }))),
        });
      }
    }
  }
  batch(s.sections, sectionRows, 1000);
  batch(s.lessons, lessonRows, 1500);
  console.log("courses ✓", { sections: sectionRows.length, lessons: lessonRows.length });

  // ---------- labs ----------
  batch(s.labs, Array.from({ length: 60 }, () => ({
    name: `${faker.helpers.arrayElement(["Linux", "Docker", "K8s", "Python", "SQL", "Network", "AWS", "Git", "React", "Security"])} ${faker.helpers.arrayElement(["Sandbox", "Playground", "Lab", "Challenge", "Workshop"])}`,
    type: faker.helpers.arrayElement(["vm", "container", "jupyter", "cloud-sandbox"] as const),
    categoryId: faker.number.int({ min: 1, max: catNames.length }),
    description: faker.lorem.sentence(),
    durationMin: faker.helpers.arrayElement([30, 45, 60, 90, 120]),
    resourceTier: faker.helpers.arrayElement(["small", "medium", "large"] as const),
    status: faker.helpers.weightedArrayElement([
      { value: "active" as const, weight: 75 },
      { value: "disabled" as const, weight: 15 },
      { value: "archived" as const, weight: 10 },
    ]),
    createdAt: d(ago(400)),
  })));

  // ---------- assessments ----------
  const assessments: InferInsertModel<typeof s.assessments>[] = [];
  for (let i = 0; i < 380; i++) {
    const kind = faker.helpers.weightedArrayElement([
      { value: "quiz" as const, weight: 60 },
      { value: "exam" as const, weight: 20 },
      { value: "assignment" as const, weight: 20 },
    ]);
    assessments.push({
      courseId: faker.number.int({ min: 1, max: 320 }),
      title: `${faker.helpers.arrayElement(topics)} ${kind === "exam" ? "Final Exam" : kind === "assignment" ? "Project" : "Quiz"} ${faker.number.int({ min: 1, max: 8 })}`,
      kind,
      questionCount: kind === "assignment" ? faker.number.int({ min: 1, max: 4 }) : faker.number.int({ min: 5, max: 40 }),
      passingScore: faker.helpers.arrayElement([60, 65, 70, 75, 80]),
      maxAttempts: faker.helpers.arrayElement([1, 2, 3, 5]),
      timeLimitMin: faker.helpers.arrayElement([15, 30, 45, 60, 90]),
      shuffleQuestions: faker.datatype.boolean(0.6),
      showResults: faker.datatype.boolean(0.8),
      status: faker.helpers.weightedArrayElement([
        { value: "published" as const, weight: 70 },
        { value: "draft" as const, weight: 20 },
        { value: "archived" as const, weight: 10 },
      ]),
      createdAt: d(ago(420)),
    });
  }
  batch(s.assessments, assessments, 1000);
  // full rows (defaults applied) — index i ↔ id i+1 on a fresh table
  const assessmentRows = db.select().from(s.assessments).orderBy(s.assessments.id).all();

  // Assessment question bank — quiz/exam are auto-scored; assignments are
  // submission-based and carry no questions (question_count derives to 0).
  const questionRows: InferInsertModel<typeof s.assessmentQuestions>[] = [];
  assessmentRows.forEach((a, i) => {
    if (a.kind === "assignment") return;
    for (let pos = 0; pos < a.questionCount; pos++) {
      const type = faker.helpers.weightedArrayElement([
        { value: "single" as const, weight: 60 },
        { value: "multi" as const, weight: 15 },
        { value: "tf" as const, weight: 25 },
      ]);
      const options =
        type === "tf"
          ? ["True", "False"]
          : Array.from({ length: 4 }, () => faker.lorem.words({ min: 2, max: 6 }));
      const correct =
        type === "multi"
          ? faker.helpers.arrayElements([0, 1, 2, 3], 2)
          : [faker.number.int({ min: 0, max: options.length - 1 })];
      questionRows.push({
        assessmentId: i + 1, // sequential ids — fresh table, insertion order
        position: pos,
        prompt: `${faker.lorem.sentence({ min: 5, max: 11 }).replace(/\.$/, "")}?`,
        type,
        options: JSON.stringify(options),
        correct: JSON.stringify(correct),
        points: faker.number.int({ min: 1, max: 2 }),
      });
    }
  });
  batch(s.assessmentQuestions, questionRows, 2000);
  console.log(`labs+assessments+${questionRows.length} questions ✓`);

  // question ids per assessment — attempt answers join on these
  const qsByAssessment = new Map<
    number, { id: number; correct: number[]; optionCount: number; points: number }[]
  >();
  for (const r of db
    .select({
      id: s.assessmentQuestions.id,
      assessmentId: s.assessmentQuestions.assessmentId,
      options: s.assessmentQuestions.options,
      correct: s.assessmentQuestions.correct,
      points: s.assessmentQuestions.points,
    })
    .from(s.assessmentQuestions)
    .orderBy(s.assessmentQuestions.assessmentId, s.assessmentQuestions.position)
    .all()) {
    const arr = qsByAssessment.get(r.assessmentId) ?? [];
    arr.push({
      id: r.id, correct: JSON.parse(r.correct),
      optionCount: JSON.parse(r.options).length, points: r.points,
    });
    qsByAssessment.set(r.assessmentId, arr);
  }

  // Published lessons per course — drives lesson_progress generation, which
  // in turn derives enrollments.progress (same formula as runtime).
  const pubByCourse = new Map<number, number[]>();
  for (const r of db
    .select({ courseId: s.sections.courseId, id: s.lessons.id })
    .from(s.lessons)
    .innerJoin(s.sections, sql`${s.lessons.sectionId} = ${s.sections.id}`)
    .where(sql`${s.lessons.status} = 'published'`)
    .orderBy(s.sections.courseId, s.sections.position, s.lessons.position)
    .all()) {
    const arr = pubByCourse.get(r.courseId) ?? [];
    arr.push(r.id);
    pubByCourse.set(r.courseId, arr);
  }

  // ---------- enrollments ----------
  const enrolRows: InferInsertModel<typeof s.enrollments>[] = [];
  const enrolPairs = new Set<string>();
  while (enrolRows.length < 60_000) {
    const u = faker.number.int({ min: 401, max: 10_000 });
    const c = faker.number.int({ min: 1, max: 320 });
    const k = `${u}:${c}`;
    if (enrolPairs.has(k)) continue;
    enrolPairs.add(k);
    const lessonTotal = pubByCourse.get(c)?.length ?? 0;
    let status = faker.helpers.weightedArrayElement([
      { value: "active" as const, weight: 85 },
      { value: "expired" as const, weight: 8 },
      { value: "suspended" as const, weight: 2 },
      { value: "completed" as const, weight: 5 },
    ]);
    // completed requires all published lessons done — impossible on an empty course
    if (status === "completed" && lessonTotal === 0) status = "active";
    const enrolled = ago(365, 0.7);
    enrolRows.push({
      userId: u, courseId: c, status, progress: 0, // derived below from lesson_progress
      enrolledAt: d(enrolled),
      expiresAt: faker.number.float() > 0.7 ? d(enrolled - 365 * DAY) : null,
      completedAt: status === "completed" ? d(Math.max(0, enrolled - ago(200))) : null,
    });
  }
  batch(s.enrollments, enrolRows, 2000);

  // lesson_progress: completed rows → all lessons; others → a random prefix
  // (non-completed can never reach 100%, so cap at n-1).
  const enrols = db
    .select({
      id: s.enrollments.id, courseId: s.enrollments.courseId, status: s.enrollments.status,
      enrolledAt: s.enrollments.enrolledAt, completedAt: s.enrollments.completedAt,
    })
    .from(s.enrollments)
    .all();
  const lpRows: InferInsertModel<typeof s.lessonProgress>[] = [];
  for (const e of enrols) {
    const ids = pubByCourse.get(e.courseId) ?? [];
    const n = ids.length;
    if (!n) continue;
    const done = e.status === "completed" ? n : faker.number.int({ min: 0, max: n - 1 });
    const end = e.completedAt?.getTime() ?? NOW;
    const span = Math.max(1, end - e.enrolledAt.getTime());
    for (let i = 0; i < done; i++) {
      lpRows.push({
        enrollmentId: e.id,
        lessonId: ids[i],
        completedAt: new Date(e.enrolledAt.getTime() + faker.number.int({ min: 0, max: span })),
      });
    }
  }
  batch(s.lessonProgress, lpRows, 2000);
  // progress is derived — same expression the runtime refreshes use
  db.run(sql.raw(`UPDATE enrollments SET progress = ${PROGRESS_EXPR}`));
  console.log(`enrollments + ${lpRows.length} lesson_progress ✓`);

  // ---------- lab assignments ----------
  const labRows: InferInsertModel<typeof s.labAssignments>[] = [];
  const labPairs = new Set<string>();
  while (labRows.length < 8_000) {
    const l = faker.number.int({ min: 1, max: 60 });
    const u = faker.number.int({ min: 401, max: 10_000 });
    const k = `${l}:${u}`;
    if (labPairs.has(k)) continue;
    labPairs.add(k);
    labRows.push({
      labId: l, userId: u,
      courseId: faker.number.float() > 0.4 ? faker.number.int({ min: 1, max: 320 }) : null,
      status: faker.helpers.arrayElement(["assigned", "running", "completed", "expired"] as const),
      assignedAt: d(ago(120, 1.3)),
      expiresAt: faker.number.float() > 0.5 ? d(-ago(60)) : null,
    });
  }
  batch(s.labAssignments, labRows, 2000);

  // ---------- assessment attempts (+ per-question answers) ----------
  // Attempts only exist on scorable assessments; per-pair attempt numbers
  // respect max_attempts; ~6% expired (abandoned, score 0, no answers).
  // score is derived from generated answers — same math as runtime scoring.
  const scorable = assessmentRows
    .map((a, i) => ({ a, id: i + 1 }))
    .filter((x) => x.a.kind !== "assignment" && x.a.questionCount > 0);
  const attemptRows: InferInsertModel<typeof s.assessmentAttempts>[] = [];
  const attemptMeta: { assessmentId: number; expired: boolean }[] = [];
  const pairCount = new Map<string, number>();
  while (attemptRows.length < 28_000) {
    const { a, id: assessmentId } = faker.helpers.arrayElement(scorable);
    const u = faker.number.int({ min: 401, max: 10_000 });
    const key = `${assessmentId}:${u}`;
    const no = pairCount.get(key) ?? 0;
    if (no >= a.maxAttempts) continue;
    pairCount.set(key, no + 1);
    const expired = faker.number.float() < 0.06;
    const submittedAt = d(ago(240, 0.9));
    attemptRows.push({
      assessmentId,
      userId: u,
      attemptNo: no + 1,
      status: expired ? "expired" : "submitted",
      startedAt: new Date(
        submittedAt.getTime() - faker.number.int({ min: 1, max: a.timeLimitMin }) * 60_000
      ),
      score: 0, // derived below from answers
      passed: false,
      submittedAt,
    });
    attemptMeta.push({ assessmentId, expired });
  }
  batch(s.assessmentAttempts, attemptRows, 2000);

  // derive per-question answers + score from them (attempt ids are sequential)
  const answerRows: InferInsertModel<typeof s.assessmentAttemptAnswers>[] = [];
  const scoreUpdates: { id: number; score: number; passed: boolean }[] = [];
  attemptMeta.forEach((m, i) => {
    const attemptId = i + 1;
    if (m.expired) {
      scoreUpdates.push({ id: attemptId, score: 0, passed: false });
      return;
    }
    const qs = qsByAssessment.get(m.assessmentId) ?? [];
    const n = qs.length;
    const a = assessmentRows[m.assessmentId - 1];
    const k = Math.round(n * faker.number.float({ min: 0.15, max: 1 }));
    let earned = 0;
    let total = 0;
    for (let qi = 0; qi < n; qi++) {
      const q = qs[qi];
      const correct = qi < k;
      total += q.points;
      if (correct) earned += q.points;
      answerRows.push({
        attemptId,
        questionId: q.id,
        selected: JSON.stringify(
          correct ? q.correct : [(q.correct[0] + 1) % q.optionCount]
        ),
        correct,
        points: correct ? q.points : 0,
      });
    }
    const score = total ? Math.round((100 * earned) / total) : 0;
    scoreUpdates.push({ id: attemptId, score, passed: score >= a.passingScore });
  });
  batch(s.assessmentAttemptAnswers, answerRows, 2000);
  for (const u of scoreUpdates) {
    db.run(sql`UPDATE assessment_attempts SET score = ${u.score}, passed = ${u.passed ? 1 : 0} WHERE id = ${u.id}`);
  }
  console.log(`labs+attempts+${answerRows.length} answers ✓`);

  // ---------- certificates (completed enrollments on cert-enabled courses —
  //   same rule the runtime auto-issuance applies) ----------
  const completed = db
    .select({
      userId: s.enrollments.userId,
      courseId: s.enrollments.courseId,
      completedAt: s.enrollments.completedAt,
    })
    .from(s.enrollments)
    .innerJoin(s.courses, sql`${s.enrollments.courseId} = ${s.courses.id}`)
    .where(sql`${s.enrollments.status} = 'completed' AND ${s.courses.certificateEnabled} = 1`)
    .all();
  batch(s.certificates, completed.map((e, i) => ({
    serial: `CERT-${String(100000 + i)}`,
    userId: e.userId, courseId: e.courseId,
    issuedAt: e.completedAt ?? d(ago(90)),
  })), 2000);

  // ---------- templates / media / paths ----------
  // announcements migrated to backend Postgres in module 1 — not seeded here.
  batch(s.emailTemplates, ["Welcome", "Enrollment Confirmation", "Password Reset", "Course Completed", "Certificate Issued", "Lab Assigned", "Weekly Digest", "Payment Receipt"].map((n) => ({
    name: n, subject: `${n} — {{platform_name}}`,
    body: `Hi {{user_name}},\n\n${faker.lorem.paragraphs(2)}\n\n— The Team`,
    updatedAt: d(ago(180)),
  })));
  batch(s.mediaAssets, Array.from({ length: 600 }, () => ({
    name: faker.system.fileName(),
    type: faker.helpers.arrayElement(["image", "video", "document", "archive"] as const),
    sizeKb: faker.number.int({ min: 20, max: 500_000 }),
    uploadedById: faker.helpers.arrayElement([...instructorIds, ...adminIds]),
    createdAt: d(ago(300)),
  })), 1000);
  batch(s.learningPaths, Array.from({ length: 18 }, (_, i) => ({
    title: `${faker.helpers.arrayElement(topics)} Learning Path`,
    slug: `path-${i + 1}`,
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(["published", "draft", "archived"] as const),
    courseIds: JSON.stringify(faker.helpers.arrayElements(Array.from({ length: 320 }, (_, k) => k + 1), faker.number.int({ min: 3, max: 7 }))),
    createdAt: d(ago(300)),
  })));
  console.log("misc ✓");

  // ---------- activity events ----------
  const actTypes = ["logged_in", "course_opened", "chapter_completed", "lab_started", "lab_completed", "assignment_submitted", "quiz_completed", "resource_downloaded", "certificate_viewed"];
  const acts: InferInsertModel<typeof s.activityEvents>[] = [];
  for (let i = 0; i < 90_000; i++) {
    const type = faker.helpers.arrayElement(actTypes);
    acts.push({
      userId: faker.number.int({ min: 401, max: 10_000 }),
      type,
      courseId: type.startsWith("lab") ? null : faker.number.float() > 0.25 ? faker.number.int({ min: 1, max: 320 }) : null,
      meta: JSON.stringify({ device: faker.helpers.arrayElement(["Chrome / macOS", "Safari / iOS", "Chrome / Windows", "Firefox / Linux"]) }),
      createdAt: d(ago(90, 1.6)),
    });
  }
  batch(s.activityEvents, acts, 2000);
  console.log("activity ✓");

  // ---------- audit logs ----------
  const auditActions = [
    { action: "created course", target: "course", module: "courses" },
    { action: "published course", target: "course", module: "courses" },
    { action: "archived course", target: "course", module: "courses" },
    { action: "updated learner", target: "learner", module: "learners" },
    { action: "suspended learner", target: "learner", module: "learners" },
    { action: "assigned lab", target: "lab", module: "labs" },
    { action: "enrolled learner in course", target: "enrollment", module: "enrollments" },
    { action: "bulk enrolled learners", target: "enrollment", module: "enrollments" },
    { action: "issued certificate", target: "certificate", module: "certificates" },
    { action: "sent announcement", target: "announcement", module: "announcements" },
    { action: "updated settings", target: "settings", module: "settings" },
    { action: "created assessment", target: "assessment", module: "assessments" },
    { action: "deleted lesson", target: "lesson", module: "courses" },
    { action: "invited instructor", target: "instructor", module: "users" },
  ];
  const audits: InferInsertModel<typeof s.auditLogs>[] = [];
  for (let i = 0; i < 25_000; i++) {
    const a = faker.helpers.arrayElement(auditActions);
    const actorName = faker.person.fullName();
    audits.push({
      actorId: faker.helpers.arrayElement(adminIds),
      actorName,
      action: a.action,
      targetType: a.target,
      targetId: faker.number.int({ min: 1, max: 320 }),
      targetLabel: faker.lorem.words({ min: 2, max: 4 }),
      module: a.module,
      details: JSON.stringify({ userAgent: "Mozilla/5.0 …", requestId: faker.string.uuid(), changes: { status: ["draft", "published"] } }),
      ip: faker.internet.ipv4(),
      createdAt: d(ago(180, 1.2)),
    });
  }
  batch(s.auditLogs, audits, 2000);
  console.log("audit ✓");
})();

// ---------- denormalized aggregates ----------
console.time("aggregates");
sqlite.exec(`
  UPDATE courses SET ${COURSE_COUNTERS_SET};
  UPDATE users SET ${USER_COUNTERS_SET};
  UPDATE assessments SET ${ASSESSMENT_COUNTERS_SET};
`);
console.timeEnd("aggregates");

const counts = sqlite.prepare(`SELECT
  (SELECT COUNT(*) FROM users) users,
  (SELECT COUNT(*) FROM courses) courses,
  (SELECT COUNT(*) FROM lessons) lessons,
  (SELECT COUNT(*) FROM enrollments) enrollments,
  (SELECT COUNT(*) FROM activity_events) activity,
  (SELECT COUNT(*) FROM audit_logs) audit`).get();
console.timeEnd("seed");
console.log(counts);
