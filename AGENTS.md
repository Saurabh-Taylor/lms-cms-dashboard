# LMS CMS Dashboard

Next.js 16 + React 19 admin CMS for an LMS. SQLite (better-sqlite3) + Drizzle ORM, Tailwind v4, shadcn (Base UI), TanStack Query + Table v8.

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` (eslint, react-hooks compiler rules — no `setState` in effects; use render-phase adjust pattern)
- `pnpm tsx scripts/seed.ts` — rebuild + seed DB (~3.4s; 10k users, 320 courses, 60k enrollments, 90k activity events)
- `pnpm drizzle-kit generate` — new migration after schema change (auto-applied by `db/client.ts` on connect)

## Conventions

- **Next 16**: `params`/`searchParams` are Promises; `RouteContext<"/path">` types for route handlers; route files export HTTP verbs only.
- **shadcn here = Base UI**: `render` prop instead of `asChild`; `onCheckedChange`, `onValueChange` signatures.
- **Tables**: all lists go through `ModuleTable`/`DataTable` + `useServerTable`/`useList`; state lives in URL params (page, pageSize, q, sort, order, filters). Never client-side full datasets.
- **APIs**: `listQuery`/`orderBy`/`listOk`/`fail`/`ok` in `src/lib/api/helpers.ts`; whitelist sort columns via sortMap; `audit()` in `src/lib/api/audit.ts` logs admin actions.
- **Route gating**: admin handlers run `requirePermission(PERM.x)` from `src/lib/me.ts` (persona + capability, mirrors backend `RequirePermissions`). `requireAdmin()` alone is only for persona-floor routes (session, picker options, global search). Permission keys are typed constants in `src/lib/permissions.ts` (`PERM`/`Perm`, mirrors the backend `role_permissions` matrix in `src/modules/auth/rbac.ts` — never raw strings); session `permissions` stay `string[]` since the backend resolves them at runtime.
- **Write routes use `verb()`** (`src/lib/api/verb.ts`): `export const PATCH = verb<"/api/admin/lessons/[id]">(PERM.courseUpdate, write.update)` — it owns gate → int-param coercion → zod parse → `ok()` envelope → `domainFail`. All mutation logic lives in `src/lib/admin/<entity>.ts` ops (`{schema, run(me, params, body)}`): the op owns the `db.transaction`, payload-conditional policy (`requireCap`, e.g. publish/suspend), derived-state calls, and audit. Write schemas (`create`/`patch`, patch = create-derived) are exported from the module — routes never hold zod.
- **Domain errors**: ops throw `DomainError(status, message)` (`src/lib/domain.ts`); `domainFail(e)` (`src/lib/api/helpers.ts`) maps it to `fail()` and rethrows everything else. External-API failures (ApiError) get converted to DomainError at the op boundary.
- **Audit**: mutations write audit inside the op's tx via `auditTx(tx, me, event, ip)` as the LAST statement (rollback removes the audit row). `ip = await clientIp()` is fetched BEFORE the sync tx opens. Async `audit()` remains only for non-tx callers (exports). Action strings are a per-module `const` vocabulary (`"published chapter"`, not free text per callsite).
- **better-sqlite3 transactions are sync** — `.run()`/`.all()` inside `db.transaction()`, never `await`. Async work (auth bridge via apiServer, `clientIp()`) happens BEFORE the tx (see `src/lib/admin/users.ts` for the boundary).
- **Derived state**: formulas in `src/lib/db/aggregates.ts` (SET fragments shared with the seed's bulk recompute); consequence ORDERING lives in `src/lib/db/derived.ts` semantic ops — `lessonCompleted` / `lessonUncompleted` / `lessonSetChanged` / `issueCertificate` (progress+flip → counters → events → certs). Callers never sequence or select refreshes themselves. Raw `refresh*` fns are for the derived ops and bulk seed only.
- **Certificates**: auto-issuance requires completed enrollment + `certificate_enabled` + no existing cert (idempotent, un-completion doesn't revoke). Manual admin issuance (`/api/admin/certificates` POST) is an override — doesn't require `certificate_enabled` but shares `insertCertificate` (same serial format + `certificate_earned` event).
- **Assessment derived state**: `attempt_count`/`avg_score`/`pass_rate` count finalized attempts only (`status != 'in_progress'`) — every metric surface (analytics included) uses the same predicate; starting an attempt consumes a slot, so `attemptsUsed` counts all attempt rows. `question_count` derives from `assessment_questions` (never writable on the assessment). Attempt lifecycle: `in_progress` (resumable, consumes an attempt at start) → `submitted`/`expired`; deadline enforced server-side (timeLimit + 60s grace); correct answers never leave the server until submission. `attempt.question_ids` snapshots the served set at start — scoring and review use it exclusively, so mid-attempt bank edits/deletes can't shift results. **Assignments**: learner submits `submission` text (no bank); `submitted + graded_at IS NULL` = pending-grade — metrics count the attempt only after `PATCH /api/admin/attempts/[id]` grades it (score, feedback, `assignment_graded` event). Learner flow: `src/lib/learner/assessments.ts`; admin question CRUD under `/api/admin/assessments/[id]/questions`, grading op in `lib/admin/assessments.ts`.
- **Catalog/self-enroll**: `src/lib/learner/catalog.ts` + `/api/learner/catalog` + `/api/learner/courses/[id]/enroll`. Only `status=published AND visibility=public` courses are visible/enrollable — others 404 (existence not leaked). Repeat enroll → 409.
- **Drizzle**: `orderBy` on sql aliases fails (`no such column`) — order by the expression itself. Column params inside `sql` templates render **unqualified** (`"id"` not `"groups"."id"`) — correlated subqueries must spell out literal table names or the inner table's column silently wins (see `groups`/`categories` count exprs).
- **DB file**: `data/lms.db` (gitignored); migrations in `drizzle/`; `pnpm tsx scripts/seed.ts` DELETES the file — restart `pnpm dev` after seeding or the server keeps writing to the unlinked inode (requests succeed, data vanishes).

- TanStack Table is pinned to **v8** — v9 is a breaking rewrite.
- **CSRF**: `src/proxy.ts` (Next 16 middleware rename) rejects cross-origin mutating `/api/*` requests — `sec-fetch-site: cross-site` or a foreign `Origin` → 403. GET/HEAD unaffected; non-browser clients (no fetch metadata) unaffected.
- **Auth**: real sessions come from the NestJS API (Better Auth). Browser only
  talks to this origin: `/api/auth/login|logout` proxy the API and forward its
  `learnhub.session_token` cookie. Server→API calls go through
  `src/lib/api-server.ts` (`apiServer`/`apiServerRaw`), never raw `fetch` +
  `process.env.API_URL`. `src/lib/me.ts` resolves the session once per request
  (React `cache`) and bridges `users.id` by email — legacy queries keep working
  until endpoints migrate. `id === -1` means "backend-only user, no local row"
  (must never leak another user's data). Middleware gates on cookie presence
  only; layouts/routes are authoritative.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
