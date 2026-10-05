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
const ALLOWLIST = new Set([
  "src/components/shared/status-badge.tsx",
  // severity palette (info=blue) — semantic, same class as status-badge
  "src/components/notifications/notification-list.tsx",
]);
const FORBIDDEN = /\b(?:sky|blue|indigo|violet)-\d{2,3}\b/;
const srcFiles: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!f.startsWith(".") && f !== "node_modules") walk(p); continue; }
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

// 4. Semantic color utilities must resolve to a --color-* token defined in
//    globals.css. `text-destructive-foreground` compiles to nothing when
//    --color-destructive-foreground doesn't exist — silently broken UI.
const DEFINED = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const DEFINED_FAMILY = new Set(
  [...DEFINED].filter((n) => /-\d+$/.test(n)).map((n) => n.replace(/-\d+$/, "")),
);
// Tailwind default palette: usable without theme tokens.
const DEFAULT_BARE = new Set(["white", "black", "transparent", "current", "inherit"]);
const DEFAULT_FAMILY = new Set([
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber",
  "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue",
  "indigo", "violet", "purple", "fuchsia", "pink", "rose",
]);
// Names after a color prefix that aren't colors. Keyed by matched prefix.
const NON_COLOR: Record<string, Set<string>> = {
  text: new Set([
    "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl",
    "left", "center", "right", "justify", "start", "end",
    "wrap", "nowrap", "balance", "pretty",
    "uppercase", "lowercase", "capitalize", "normal-case",
    "underline", "overline", "line-through", "no-underline",
    "ellipsis", "clip", "truncate",
  ]),
  bg: new Set([
    "fixed", "local", "scroll", "auto", "cover", "contain",
    "bottom", "top", "left", "right", "center",
    "repeat", "no-repeat", "repeat-x", "repeat-y", "repeat-round", "repeat-space",
    "none",
  ]),
  border: new Set(["solid", "dashed", "dotted", "double", "hidden", "none", "collapse", "separate", "t", "r", "b", "l", "x", "y"]),
  ring: new Set(["inset", "none"]),
  shadow: new Set(["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "inner", "none"]),
  "inset-shadow": new Set(["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "none"]),
  "drop-shadow": new Set(["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "none"]),
  "text-shadow": new Set(["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "none"]),
  outline: new Set(["none", "hidden", "solid", "dashed", "dotted", "double"]),
  divide: new Set(["x", "y", "x-reverse", "y-reverse", "solid", "dashed", "dotted", "double", "none"]),
  decoration: new Set(["solid", "double", "dotted", "dashed", "wavy", "none", "underline", "overline", "line-through"]),
  accent: new Set(["auto", "none"]),
  caret: new Set(["auto", "none"]),
  fill: new Set(["none"]),
  stroke: new Set(["none"]),
};
// Longer prefixes first so `text-shadow-lg` isn't seen as `text-` + `shadow-lg`.
const COLOR_UTILITY = new RegExp(
  "\\b(drop-shadow|inset-shadow|text-shadow|inset-ring|ring-offset|border-[trblxy]|bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|accent|caret|placeholder|shadow)-([a-z][a-z0-9-]*)",
  "g",
);
for (const p of srcFiles) {
  // Blank [...] contents: arbitrary values like transition-[...,border-color,...]
  // embed CSS property names that aren't utility classes.
  const s = readFileSync(p, "utf8").replace(/\[[^\]]*\]/g, (m) => " ".repeat(m.length));
  for (const m of s.matchAll(COLOR_UTILITY)) {
    const [match, prefix, name] = m;
    // Preceded by `-` or alnum → hyphenated prose ("server-to-server") or a
    // CSS var key ("--border-radius"), not a utility.
    const prev = s[m.index - 1];
    if (prev === "-" || /[a-z0-9]/.test(prev ?? "")) continue;
    if (/\d/.test(name)) {
      // `chart-9`: flag a mistyped shade of a project token family only.
      const fam = name.replace(/-\d.*$/, "");
      if (!DEFAULT_FAMILY.has(fam) && !DEFINED.has(name) && DEFINED_FAMILY.has(fam)) {
        errors.push(`${p}: "${match}" — --color-${name} is not defined`);
      }
      continue;
    }
    if (DEFINED.has(name) || DEFAULT_BARE.has(name) || NON_COLOR[prefix]?.has(name)) continue;
    if (prefix === "bg" && /^(?:linear|radial|conic|gradient|blend|clip|origin|position|size)(?:-|$)/.test(name)) continue;
    errors.push(`${p}: "${match}" — --color-${name} is not defined`);
  }
}

if (errors.length) {
  console.error("Brand token check failed:\n" + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("Brand token check passed (Microshala logo palette, light + dark).");
