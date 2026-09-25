import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";

/**
 * Shared shell for all auth screens (login, signup, future reset/invite flows).
 * Split-screen on desktop: focused form column + restrained product panel.
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
          <span className="text-[15px] font-semibold tracking-tight">LearnHub CMS</span>
        </Link>

        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[352px] animate-in fade-in slide-in-from-bottom-1 duration-(--duration-normal)">
            {children}
          </div>
        </main>

        <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
          Learning operations, simplified.
        </p>
      </div>

      {/* Product panel — decorative, hidden below lg */}
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

        {/* minimal product mock — decorative only, not real data */}
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <div className="w-full max-w-sm rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
              <span className="size-2 rounded-full bg-border" />
              <span className="size-2 rounded-full bg-border" />
              <span className="size-2 rounded-full bg-border" />
            </div>
            <div className="flex gap-0 p-4">
              <div className="flex w-20 flex-col gap-2 border-r pr-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-2 rounded-sm ${i === 1 ? "bg-primary/40" : "bg-muted"}`} />
                ))}
              </div>
              <div className="flex-1 pl-4">
                <div className="mb-3 h-2 w-24 rounded-sm bg-muted" />
                <div className="mb-2 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 flex-1 rounded-md border bg-background" />
                  ))}
                </div>
                <div className="flex h-20 items-end gap-1.5 rounded-md border bg-background p-2">
                  {[35, 55, 42, 70, 60, 82, 68].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/25"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="max-w-xs text-sm font-medium text-foreground">
            Manage courses, learners and learning operations from one workspace.
          </p>
          <p className="mt-1.5 text-(length:--fs-meta) leading-4 text-muted-foreground">
            Curriculum, assessments and analytics — built for administrators.
          </p>
        </div>
      </aside>
    </div>
  );
}
