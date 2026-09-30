/**
 * Regression guard for the Microshala brand palette (specs #53/#55).
 *
 * Catches two drift classes:
 *  1. Brand tokens in globals.css drifting off the logo palette
 *     (someone "fixes" a color by hand instead of changing the token).
 *  2. Components reintroducing blue-family utilities — the pre-rebrand
 *     default palette — outside the explicit semantic allowlist.
 *
 * Run: pnpm test
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync("src/app/globals.css", "utf8");
const errors: string[] = [];

const block = (sel: string) => {
  const m = css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  return m?.[1] ?? "";
};
const root = block(":root"); // FIRST :root only — the second holds --fs-* typography
const dark = block(".dark");

// 1. Brand tokens pin the palette (oklch of #FD9E0F gold primary, #F26B32
//    accent orange, #2B2B2E ink, creams). Gold primaries pair with dark ink.
const TOKENS: Record<string, Record<string, string>> = {
  ":root": {
    "--background": "oklch(0.978 0.009 78.3)",
    "--foreground": "oklch(0.29 0.005 286.1)",
    "--primary": "oklch(0.778 0.169 67.2)",
    "--primary-foreground": "oklch(0.29 0.005 286.1)",
    "--muted": "oklch(0.947 0.01 81.8)",
    "--muted-foreground": "oklch(0.529 0.008 286.1)",
    "--accent": "oklch(0.949 0.033 77.6)",
    "--accent-foreground": "oklch(0.508 0.108 73.3)",
    "--border": "oklch(0.913 0.014 74.4)",
    "--ring": "oklch(0.778 0.169 67.2)",
    "--chart-1": "oklch(0.778 0.169 67.2)",
    "--chart-2": "oklch(0.685 0.18 41.4)",
    "--sidebar": "oklch(0.958 0.01 80)",
    "--sidebar-primary": "oklch(0.778 0.169 67.2)",
    "--sidebar-primary-foreground": "oklch(0.29 0.005 286.1)",
    "--sidebar-accent": "oklch(0.949 0.033 77.6)",
    "--sidebar-ring": "oklch(0.778 0.169 67.2)",
  },
  ".dark": {
    "--primary": "oklch(0.778 0.169 67.2)",
    "--primary-foreground": "oklch(0.24 0.02 45)",
    "--accent": "oklch(0.3 0.045 55)",
    "--accent-foreground": "oklch(0.87 0.1 72)",
    "--ring": "oklch(0.778 0.169 67.2)",
    "--chart-1": "oklch(0.778 0.169 67.2)",
    "--sidebar-primary": "oklch(0.778 0.169 67.2)",
    "--sidebar-primary-foreground": "oklch(0.24 0.02 45)",
    "--sidebar-accent": "oklch(0.28 0.03 50)",
    "--sidebar-ring": "oklch(0.778 0.169 67.2)",
  },
};

for (const [sel, tokens] of Object.entries(TOKENS)) {
  const b = sel === ":root" ? root : dark;
  if (!b) { errors.push(`${sel} block not found in globals.css`); continue; }
  for (const [name, want] of Object.entries(tokens)) {
    const m = b.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*([^;]+);`));
    if (!m) errors.push(`${sel}: ${name} missing`);
    else if (m[1].trim() !== want) errors.push(`${sel}: ${name} = "${m[1].trim()}", expected "${want}"`);
  }
}

// 2. No hue-264 oklch left in brand-accent tokens — the retired indigo
//    palette. Surface/foreground neutrals may keep a faint warm-neutral tint.
for (const m of css.matchAll(/--(?:primary|ring|accent|chart-\d|sidebar-(?:primary|accent|ring))\s*:\s*oklch\([^)]*\s264\.?\d*\s*\)/g)) {
  errors.push(`residual indigo brand token: ${m[0]}`);
}

// 3. Blue-family utilities forbidden in components; allowlist = semantic
//    status colors only (status badges intentionally differ from brand).
const ALLOWLIST = new Set(["src/components/shared/status-badge.tsx"]);
const FORBIDDEN = /\b(?:sky|blue|indigo|violet)-\d{2,3}\b/;
const srcFiles: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!p.includes("node_modules")) walk(p); continue; }
    if (/\.(tsx?|jsx?)$/.test(p)) srcFiles.push(p);
  }
};
walk("src");
for (const p of srcFiles) {
  if (ALLOWLIST.has(p)) continue;
  const s = readFileSync(p, "utf8");
  const hit = s.match(FORBIDDEN);
  if (hit) errors.push(`${p}: brand-foreign utility "${hit[0]}" — use brand tokens (primary/accent) instead`);
}

if (errors.length) {
  console.error("Brand token check failed:\n" + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("Brand token check passed (Microshala logo palette, light + dark).");
