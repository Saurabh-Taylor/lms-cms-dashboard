import Link from "next/link";
import { AwardIcon, GraduationCapIcon, TrendingUpIcon } from "lucide-react";

/**
 * Shared shell for all auth screens (login, signup, forgot/reset password).
 * Split-screen on desktop: focused form column + learner-flavored panel.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      {/* Form column */}
      <div className="flex min-w-0 flex-1 flex-col px-6 py-6 sm:px-10 md:py-8">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCapIcon className="size-4" />
          </span>
          <span translate="no" className="text-[15px] font-semibold tracking-tight">LearnHub</span>
        </Link>

        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[352px] animate-in fade-in slide-in-from-bottom-1 duration-(--duration-normal)">
            {children}
          </div>
        </main>

        <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
          Your learning, all in one place.
        </p>
      </div>

      {/* Learner panel — decorative, hidden below lg */}
      <aside
        aria-hidden
        className="relative hidden flex-1 overflow-hidden border-l bg-muted/40 lg:block"
      >
        {/* dot grid + soft glow */}
        <div
          className="absolute inset-0 opacity-60 dark:opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 30%, color-mix(in oklch, var(--primary) 9%, transparent), transparent 70%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-center gap-9 p-12 xl:p-16">
          <div>
            <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-balance text-foreground">
              Pick up where you left off.
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Every course, deadline and certificate — waiting exactly where you stopped.
            </p>
          </div>

          {/* Floating learner-UI collage — echoes the real LearningCard /
              certificate / streak surfaces, decorative mock data only */}
          <div className="relative h-72 max-w-md">
            {/* certificate — behind, tilted top-right */}
            <div className="absolute top-0 right-0 w-56 -translate-y-1 rotate-6 rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <AwardIcon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Certificate earned
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium">SQL Basics</p>
                </div>
              </div>
              <p className="mt-3 border-t pt-2.5 text-(length:--fs-meta) leading-4 text-muted-foreground">
                Issued Sep 2026
              </p>
            </div>

            {/* course card — hero, front-left, mirrors LearningCard anatomy */}
            <div className="absolute top-14 left-0 w-72 overflow-hidden rounded-xl border bg-card shadow-md">
              <div className="h-1.5 bg-primary/70" />
              <div className="flex flex-col gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Advanced SQL</p>
                  <p className="mt-0.5 truncate text-(length:--fs-meta) leading-4 text-muted-foreground">
                    Maya Chen · Databases · 4h 20m
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[68%] rounded-full bg-primary" />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">68%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    In progress
                  </span>
                  <span className="inline-flex h-7 items-center rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground">
                    Continue
                  </span>
                </div>
              </div>
            </div>

            {/* streak chip — floats bottom-right of the collage */}
            <div className="absolute right-2 bottom-0 flex items-center gap-2.5 rounded-full border bg-card py-2 pr-4 pl-2.5 shadow-sm">
              <span className="grid size-7 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUpIcon className="size-4" />
              </span>
              <div>
                <p className="text-xs leading-4 font-medium">7-day streak</p>
                <p className="text-[11px] leading-4 text-muted-foreground">12 lessons done</p>
              </div>
            </div>
          </div>

          <figure className="max-w-sm rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex gap-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                PK
              </span>
              <div>
                <blockquote className="text-sm leading-6 text-foreground">
                  “Finished my onboarding track between meetings — the progress
                  bar kept me going.”
                </blockquote>
                <figcaption className="mt-2 text-(length:--fs-meta) leading-4 text-muted-foreground">
                  Priya · Support engineer
                </figcaption>
              </div>
            </div>
          </figure>
        </div>
      </aside>
    </div>
  );
}
