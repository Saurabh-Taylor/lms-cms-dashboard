# Microshala — Domain Glossary

Ubiquitous language for the LMS. Pure vocabulary — no implementation details.

## People

- **Persona** — which portal a user enters: `admin` or `learner`. Set by role; determines the floor of what they can reach.
- **Role** — a named bundle of **permissions** (e.g. `super_admin`, `content_manager`, `support`, `learner`). The backend RBAC matrix is the source of truth; the frontend never holds its own copy.
- **Permission** — a `domain:action` capability key (e.g. `course:publish`, `learner:suspend`). Checked per request against the live matrix.
- **Instructor / Support / Content manager** — admin-persona roles with partial permission sets.

## Learning content

- **Course** — published unit of learning; owns sections, lessons, enrollments, assessments, and certificate policy.
- **Course visibility** — `public` (listed in the learner catalog, self-enrollable), `unlisted` (reachable only by direct link/admin assignment), `private` (admin-assigned only).
- **Catalog** — the learner-facing shelf of published public courses; the only surface where self-enrollment happens.
- **Section** — ordered grouping of lessons inside a course.
- **Lesson** — smallest unit of content; has a status (`draft`/`published`/`archived`). Only *published* lessons count toward progress.
- **Published set** — the set of published lessons in a course at a moment in time. Both the numerator and denominator of progress are measured against it — unpublishing removes a lesson from both.
- **Curriculum** — the section/lesson tree edited in the course editor.

## Enrollment & progress

- **Enrollment** — a user's seat in a course; lifecycle `active → completed` (or `expired`/`suspended`/`invited`).
- **Lesson completion** — a recorded `(enrollment, lesson)` pair marking a lesson done; the only source rows for progress.
- **Progress** — *derived*: completed published lessons ÷ total published lessons. Never written directly; recomputed when completions or the published set change.
- **Derived state** — any stored value computed from source rows (progress, counters, completion status). Maintained transactionally at the write that changes its sources; seed data must satisfy the same formulas.

## Assessment

- **Assessment** — a scored evaluation attached to a course; kinds: `quiz`, `exam`, `assignment`. Quiz/exam score from the question bank; assignments are submission-based and human-graded.
- **Question bank** — an assessment's ordered questions; each is `single`/`multi`/`tf` with options, correct indices, and points. `question_count` is derived from bank rows.
- **Attempt** — one sit-down against an assessment. Starting *consumes* an attempt even if never submitted.
- **Attempt lifecycle** — `in_progress` (resumable, server-held deadline = start + time limit) → `submitted` | `expired`.
- **Finalized attempt** — `submitted` or `expired`. Only finalized attempts count toward metrics (attempt counts, averages, pass rates); assignment attempts additionally require a **grade** first.
- **Submission** — the learner's assignment work (text/links), stored on the attempt; the only payload an assignment carries.
- **Grade** — an admin-set score + optional feedback on a submitted assignment attempt; `graded_at` marks it. Until graded, a submitted assignment is **pending-grade** and invisible to metrics.
- **Score** — earned points ÷ total points for quiz/exam, server-computed at submit; for assignments, admin-assigned at grade time. Never client-supplied.
- **Show-results policy** — whether the learner sees per-question review after submission. Correct answers never leave the server before submission regardless.

## Certificates

- **Certificate** — proof of course completion, unique per `(user, course)`.
- **Auto-issuance** — granted when an enrollment reaches `completed` *and* the course's `certificateEnabled` flag is set.
- **Manual issuance** — an audited admin override; does *not* require the flag (human intent supersedes policy).
- **Revocation** — not automatic: un-completing a course does not remove an issued certificate.

## Operations vocabulary

- **Counter refresh** — recomputing a derived counter for one entity inside the mutation's transaction.
- **Semantic operation** — a domain operation owning its transaction, refresh set, permission policy, and audit emission (e.g. "complete lesson", "publish lesson", "issue certificate"). Callers cannot select or order the refreshes themselves.
- **Audit event** — an admin action logged with actor, action verb, target, and details.
- **Activity event** — a learner-visible feed entry (logged_in, chapter_completed, course_completed, certificate_earned, quiz_completed, …).
