import Link from "next/link";
import {
  AwardIcon,
  BookOpenIcon,
  GraduationCapIcon,
  TrendingUpIcon,
} from "lucide-react";

const FEATURES = [
  {
    icon: BookOpenIcon,
    title: "A catalog built for you",
    description: "Courses, paths and resources picked by your team.",
  },
  {
    icon: TrendingUpIcon,
    title: "Progress that sticks",
    description: "Lessons, streaks and milestones tracked as you learn.",
  },
  {
    icon: AwardIcon,
    title: "Certificates you earn",
    description: "Finish a track and take the certificate with you.",
  },
] as const;

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

        <div className="absolute inset-0 flex flex-col justify-center gap-10 p-12 xl:p-16">
          <div>
            <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-balance text-foreground">
              Pick up where you left off.
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Every course, deadline and certificate — waiting exactly where you stopped.
            </p>
          </div>

          <ul className="flex max-w-sm flex-col gap-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border bg-card text-primary shadow-sm">
                  <f.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{f.title}</span>
                  <span className="mt-0.5 block text-(length:--fs-meta) leading-5 text-muted-foreground">
                    {f.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <figure className="max-w-sm rounded-xl border bg-card p-5 shadow-sm">
            <blockquote className="text-sm leading-6 text-foreground">
              “Finished my onboarding track between meetings — the progress bar
              kept me going.”
            </blockquote>
            <figcaption className="mt-3 text-(length:--fs-meta) leading-4 text-muted-foreground">
              Priya · Support engineer
            </figcaption>
          </figure>
        </div>
      </aside>
    </div>
  );
}
