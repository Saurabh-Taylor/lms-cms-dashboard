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
- **better-sqlite3 transactions are sync** — `.run()`/`.all()` inside `db.transaction()`, never `await`.
- **Drizzle**: `orderBy` on sql aliases fails (`no such column`) — order by the expression itself.
- **DB file**: `data/lms.db` (gitignored); migrations in `drizzle/`.
- TanStack Table is pinned to **v8** — v9 is a breaking rewrite.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
