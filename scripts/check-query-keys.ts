/**
 * Regression guard for the query-key convention (wayfinder 14).
 *
 * An "/api/…" endpoint literal inside a queryKey:/invalidate: is drift —
 * the literal belongs once in qk (src/lib/query-keys.ts) and callers
 * reference qk.*. This is what the pre-11 `["me"]` vs `["/api/admin/me"]`
 * split looked like; it returns as a stale-cache bug, not a test failure.
 *
 * Reads keying on [endpoint, params] via useList/useDetail pass — the
 * endpoint there is a parameter, not a literal.
 *
 * Run: pnpm test
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KEY_POSITION = /\b(queryKey|invalidate)\s*:/;
const API_LITERAL = /["'`]\/api\//;
// Laundered drift: an api literal bound to a name (const KEY = "/api/…",
// return [`/api/…`]) still bypasses qk when the name lands in a key position.
// Only flags literals that ARE the bound value — `const res = api("/api/x")`
// binds a call result, not the literal, and passes.
const BOUND_LITERAL =
  /\b(?:const|let|var)\s+\w+\s*=\s*(?:["'`]\/api\/|\[\s*["'`]\/api\/|\([^)]*\)\s*=>\s*[\["'`][^\n]*\/api\/)|\breturn\s+[\[("'`][^\n]*\/api\//;

const files: string[] = [];
const walk = (dir: string) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e !== ".kilo") walk(p);
      continue;
    }
    if (/\.(ts|tsx)$/.test(e)) files.push(p);
  }
};
walk("src");

const errors: string[] = [];
for (const file of files) {
  // query-keys.ts is the registry — literals live there by definition;
  // src/app/api/** route handlers legitimately hold endpoint literals.
  if (file.endsWith("query-keys.ts")) continue;
  const isRouteHandler = file.includes("app/api/");
  const lines = readFileSync(file, "utf8").split("\n");
  let depth = 0; // >0 → inside a queryKey:/invalidate: array
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    if (!isRouteHandler && BOUND_LITERAL.test(line)) {
      errors.push(`${file}:${i + 1} endpoint literal bound to a name — put it in qk.* instead`);
    }
    if (depth === 0 && !KEY_POSITION.test(line)) continue;
    if (API_LITERAL.test(line)) {
      errors.push(`${file}:${i + 1} endpoint literal in query key — use a qk.* entry`);
    }
    depth += (line.match(/\[/g) ?? []).length - (line.match(/]/g) ?? []).length;
    if (depth < 0) depth = 0;
  }
}

if (errors.length) {
  console.error("Query-key check failed:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`Query-key check passed (${files.length} files scanned).`);
