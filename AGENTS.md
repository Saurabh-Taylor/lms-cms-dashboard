# LearnHub LMS — Admin CMS + Learner Portal (UI)

Next.js 16 + React 19 UI for LearnHub. **All domain data lives in the NestJS/Postgres backend** (`../cms-lms-test-devin-swe-2-nest-backend`, `http://localhost:4000`) — this app is a BFF: pages fetch via `apiServer`, `/api/*` route handlers are thin `proxy()` forwards with defense-in-depth gates.

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` (eslint, react-hooks compiler rules — no `setState` in effects; use render-phase adjust pattern)
- `pnpm test` — typography token check
- Backend owns all data: `cd ../cms-lms-test-devin-swe-2-nest-backend && pnpm start:dev` (+ its own seed/migration scripts)

## Architecture

- **Backend = source of truth.** Postgres + Better Auth + RBAC + domain-state engine (counters, progress, certs, audit). See `../cms-lms-test-devin-swe-2-nest-backend/docs/adr/0001-backend-cutover.md` and `docs/migration-plan.md` there.
- **Route handlers = `proxy()` one-liners** (`src/lib/api/proxy.ts`): `proxy(target, gate)` — gate → param substitution → verbatim forward (query + body + cookies). The backend Zod pipe is the only validator; this layer never parses payloads.
- **Server components fetch via `apiServer`** (`src/lib/api-server.ts`) — forwards the session cookie + origin/request-id headers. Never raw `fetch` + `process.env.API_URL`.
- **Session = `getCurrentUser()`** (`src/lib/me.ts`, React-cached): one `/api/v1/me` call → `{id: pg users.id, role: persona, appRole, permissions, uiPreferences}`. Route gates: `requirePermission(PERM.x)` / `requireAdmin()` / `requireLearner()` — mirrors backend RequirePermissions/persona guards. `permissions` stays `string[]` (backend resolves at runtime); use typed `PERM` constants from `src/lib/permissions.ts`, never raw strings.
- **Auth**: Better Auth lives backend-side. `/api/auth/login|logout|signup` proxy it and forward `learnhub.session_token` Set-Cookie. `src/lib/session.ts` holds cookie names + `portalRole` re-export (permanent shim for `@learnhub/contracts` personaFor). `src/proxy.ts` (Next 16 middleware) rejects cross-origin mutating `/api/*` requests — GET/HEAD and non-browser clients unaffected.
- **Contracts**: `@learnhub/contracts` is a `link:` dep into the backend's `src/contracts/` — shared enums/schemas/persona helpers; both repos must stay co-located. `next.config.ts` sets `transpilePackages` + `turbopack.root` (required for the symlink).

## Conventions

- **Next 16**: `params`/`searchParams` are Promises; `RouteContext<"/path">` types for route handlers; route files export HTTP verbs only. Next 16 differs from older Next — consult `node_modules/next/dist/docs/` before Next-specific changes.
- **shadcn here = Base UI**: `render` prop instead of `asChild`; `onCheckedChange`, `onValueChange` signatures.
- **Tables**: all lists go through `ModuleTable`/`DataTable` + `useServerTable`/`useList`; state lives in URL params (page, pageSize, q, sort, order, filters). Never client-side full datasets. Backend list contract: `{data,total,page,pageSize}`.
- **Wire shapes**: `src/lib/types.ts` mirrors backend DTOs — jsonb columns arrive as real objects/arrays (no JSON.parse), timestamps as ISO strings, counts as numbers.
- **Mutations from the browser**: `api()`/`useApiMutation` in `src/lib/api-client.ts` / `src/lib/query.ts`; TanStack Query for reads, invalidation via `invalidate` keys.
- TanStack Table is pinned to **v8** — v9 is a breaking rewrite. Its `useReactTable` API trips the react-hooks compiler rule — the warning is upstream and benign (compiler skips the component).

## Known product gaps (tracked as tickets in the backend repo)

- `docs/tickets/group-member-and-path-content-management.md` — group member + learning-path content management (list-only today)
- `docs/tickets/media-upload-surface.md` — media upload/storage/management (list-only today)
