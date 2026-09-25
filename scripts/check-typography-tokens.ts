/**
 * Regression guard for the per-admin typography system.
 *
 * Catches the class of bug where a group's preset mapping or CSS wiring drifts
 * from the product baseline — e.g. the `text-(--fs-*)` ambiguity that compiled
 * to `color:` instead of `font-size:` and silently enlarged the whole admin UI.
 *
 * Run: pnpm test
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  TYPE_GROUPS, SIZE_ORDER, isValidSize, adminShellVars,
} from "../src/lib/ui-preferences";

const css = readFileSync("src/app/globals.css", "utf8");
const rootBlock = css.slice(css.lastIndexOf(":root"));
const errors: string[] = [];

// 1. Every group's "default" preset must equal the :root fallback — that IS the
//    product baseline, and it must match what the UI shipped before prefs.
for (const g of TYPE_GROUPS) {
  const re = new RegExp(`${g.cssVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*([^;]+);`);
  const m = rootBlock.match(re);
  if (!m) { errors.push(`${g.key}: ${g.cssVar} missing from :root`); continue; }
  if (m[1].trim() !== g.px.default)
    errors.push(`${g.key}: default "${g.px.default}" != :root "${m[1].trim()}"`);
}

// 2. Each cssVar must be consumed via the length-hinted syntax
//    text-(length:--fs-x). Plain text-(--fs-x) compiles to color, and named
//    utilities (text-sidebar-nav etc.) are silently merged away by cn().
const srcFiles: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!p.includes("node_modules")) walk(p); continue; }
    if (/\.(tsx?|jsx?)$/.test(p)) srcFiles.push(p);
  }
};
walk("src");
const allSrc = srcFiles.map((p) => readFileSync(p, "utf8")).join("\n");

for (const g of TYPE_GROUPS) {
  if (!allSrc.includes(`text-(length:${g.cssVar})`))
    errors.push(`${g.key}: no component consumes ${g.cssVar} via text-(length:...)`);
}

// 3. Forbidden patterns that compile/merge wrong.
for (const p of srcFiles) {
  const s = readFileSync(p, "utf8");
  if (s.includes("text-(--fs-"))
    errors.push(`${p}: ambiguous text-(--fs-*) compiles to color, not font-size`);
  for (const g of TYPE_GROUPS) {
    const named = `text-${g.cssVar.replace("--fs-", "")}`;
    if (new RegExp(`["'\`\\s]${named.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\"'\`\\s]`).test(s))
      errors.push(`${p}: named utility "${named}" gets merged away by cn() — use text-(length:${g.cssVar})`);
  }
}

// 4. Preset sanity: 4 options, ordered ascending, valid names, "default" present.
for (const g of TYPE_GROUPS) {
  const px = SIZE_ORDER.map((s) => parseFloat(g.px[s]));
  if (SIZE_ORDER.length !== 4) errors.push("expected exactly 4 size presets");
  if (!px.every((v, i) => i === 0 || v > px[i - 1]))
    errors.push(`${g.key}: preset px not strictly ascending: ${JSON.stringify(g.px)}`);
  if (!("default" in g.px)) errors.push(`${g.key}: missing "default" preset`);
}

// 5. Sparse-override contract: defaults resolve to :root values; overrides map
//    only their own group (isolation).
const defaults = adminShellVars({});
for (const g of TYPE_GROUPS)
  if (defaults[g.cssVar] !== g.px.default)
    errors.push(`${g.key}: empty prefs resolve to ${defaults[g.cssVar]}, expected ${g.px.default}`);

const custom = adminShellVars({ typography: { sidebarNav: "large" } });
if (custom["--fs-sidebar-nav"] !== "15px")
  errors.push("sidebarNav=large should resolve to 15px");
for (const g of TYPE_GROUPS)
  if (g.key !== "sidebarNav" && custom[g.cssVar] !== g.px.default)
    errors.push(`isolation leak: sidebarNav=large changed ${g.key}`);

if (!isValidSize("large") || isValidSize("huge") || isValidSize(13))
  errors.push("isValidSize accepts invalid values");

if (errors.length) {
  console.error("Typography token check failed:\n" + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`Typography token check passed (${TYPE_GROUPS.length} groups, ${SIZE_ORDER.length} presets).`);
