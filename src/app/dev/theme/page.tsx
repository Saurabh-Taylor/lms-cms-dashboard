import { notFound } from "next/navigation";

/**
 * Dev-only theme swatches — renders every semantic token surface in light
 * and dark side by side. Exists so color decisions are looked at, not
 * guessed at. 404s in production builds.
 */

export const metadata = { title: "Theme tokens" };

const PAIRS: readonly [name: string, bg: string, fg: string][] = [
  ["card", "bg-card", "text-card-foreground"],
  ["popover", "bg-popover", "text-popover-foreground"],
  ["primary", "bg-primary", "text-primary-foreground"],
  ["secondary", "bg-secondary", "text-secondary-foreground"],
  ["muted", "bg-muted", "text-muted-foreground"],
  ["accent", "bg-accent", "text-accent-foreground"],
  ["sidebar", "bg-sidebar", "text-sidebar-foreground"],
  ["sidebar-primary", "bg-sidebar-primary", "text-sidebar-primary-foreground"],
  ["sidebar-accent", "bg-sidebar-accent", "text-sidebar-accent-foreground"],
];

const CHIPS: readonly [name: string, cls: string][] = [
  ["destructive", "bg-destructive"],
  ["border", "bg-border"],
  ["input", "bg-input"],
  ["ring", "bg-ring"],
  ["chart-1", "bg-chart-1"],
  ["chart-2", "bg-chart-2"],
  ["chart-3", "bg-chart-3"],
  ["chart-4", "bg-chart-4"],
  ["chart-5", "bg-chart-5"],
];

const RECIPES: readonly [name: string, cls: string][] = [
  ["bg-destructive text-white", "bg-destructive text-white"],
  ["bg-destructive/15 text-destructive", "bg-destructive/15 text-destructive"],
  ["bg-red-600 text-white", "bg-red-600 text-white"],
  ["bg-accent text-accent-foreground", "bg-accent text-accent-foreground"],
  ["bg-primary text-primary-foreground", "bg-primary text-primary-foreground"],
];

function Swatches() {
  return (
    <div className="flex flex-col gap-6 bg-background p-6 text-foreground">
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide uppercase opacity-60">
          Surface / foreground pairs
        </h2>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {PAIRS.map(([name, bg, fg]) => (
            <div key={name} className={`rounded-md border p-3 ${bg}`}>
              <div className={`text-sm font-medium ${fg}`}>{name}</div>
              <p className={`mt-1 text-xs ${fg} opacity-80`}>
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide uppercase opacity-60">
          Color chips
        </h2>
        <div className="flex flex-wrap gap-3">
          {CHIPS.map(([name, cls]) => (
            <div key={name} className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block size-5 rounded-full border ${cls}`} />
              {name}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide uppercase opacity-60">
          Common recipes
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {RECIPES.map(([name, cls]) => (
            <span
              key={name}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide uppercase opacity-60">
          On background
        </h2>
        <p className="text-sm">
          Default body copy on <code>bg-background text-foreground</code>.{" "}
          <span className="text-muted-foreground">Muted text variant.</span>
        </p>
      </section>
    </div>
  );
}

export default function ThemePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Theme tokens</h1>
        <p className="text-muted-foreground text-sm">
          Dev-only palette reference — <code>/dev/theme</code>
        </p>
      </header>
      <div className="grid lg:grid-cols-2">
        <div>
          <div className="border-b px-6 py-2 text-xs font-medium uppercase opacity-60">
            Light
          </div>
          <Swatches />
        </div>
        <div className="dark">
          <div className="border-b px-6 py-2 text-xs font-medium uppercase opacity-60">
            Dark
          </div>
          <Swatches />
        </div>
      </div>
    </div>
  );
}
