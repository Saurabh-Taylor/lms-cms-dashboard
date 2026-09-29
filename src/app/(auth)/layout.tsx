import Link from "next/link";
import {
  ArrowRightIcon,
  AwardIcon,
  BarChart3Icon,
  CalendarCheck2Icon,
  ChevronRightIcon,
  DatabaseIcon,
  FlameIcon,
  PlayIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/logo";

/**
 * Shared shell for all auth screens (login, signup, forgot/reset password).
 * Split-screen on desktop: focused form column + learner-flavored panel.
 */

// Deterministic starfield — module-level so SSR and hydration render
// identical positions (no Math.random in render).
const STARS = Array.from({ length: 70 }, (_, i) => ({
  cx: (i * 97 + 41) % 1000,
  cy: (i * 61 + 17) % 560,
  r: 0.5 + ((i * 7) % 10) / 14,
  o: 0.25 + ((i * 13) % 10) / 16,
}));
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      {/* Form column */}
      <div className="flex min-w-0 flex-1 flex-col px-6 py-6 sm:px-10 md:py-8">
        <Link href="/" className="flex w-fit items-center">
          <BrandLogo className="h-9" />
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

      {/* Learner panel — decorative, hidden below lg. Always-dark brand scene:
          starfield + mountains + glowing journey path + glassmorphic cards. */}
      <aside
        aria-hidden
        className="relative hidden flex-1 overflow-hidden border-l lg:block"
        style={{ background: "#070b16" }}
      >
        {/* starfield (top ~60%) */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMin slice">
          {STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#cdd8f0" opacity={s.o} />
          ))}
        </svg>

        {/* aurora wash + planet ring, top-right */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 42% at 88% -4%, rgba(96,165,250,.22), transparent 68%), radial-gradient(40% 30% at 100% 0%, rgba(147,197,253,.14), transparent 60%)",
          }}
        />
        <div className="absolute -top-40 -right-40 size-[560px] rounded-full border border-white/[0.06] bg-white/[0.015]" />

        {/* mountains + glowing journey path — anchored to the bottom edge */}
        <svg
          className="absolute inset-x-0 bottom-0 h-[58%] w-full"
          viewBox="0 0 1000 430"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            <filter id="journey-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* back ridge — lighter, rim-lit */}
          <path
            d="M0 275 L90 215 L170 255 L260 175 L340 240 L430 180 L520 250 L620 155 L710 220 L810 130 L900 195 L1000 160 L1000 430 L0 430 Z"
            fill="#0e1729"
          />
          {/* journey path — S-curve rising over the ridge, glowing */}
          <path
            d="M-20 415 C 140 395 210 330 300 305 C 400 278 470 305 545 255 C 620 208 660 168 725 138 C 790 108 870 92 1020 48"
            fill="none"
            stroke="#5e9dff"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#journey-glow)"
          />
          {/* waypoint nodes on the path */}
          {[300, 545, 725].map((x, i) => {
            const y = [305, 255, 138][i];
            return (
              <g key={x}>
                <circle cx={x} cy={y} r="11" fill="#60a5fa" opacity="0.22" />
                <circle cx={x} cy={y} r="4" fill="#bfdbfe" filter="url(#journey-glow)" />
              </g>
            );
          })}
          {/* front ridge — darkest */}
          <path
            d="M0 345 L120 285 L230 335 L360 250 L470 325 L600 240 L730 320 L860 255 L1000 315 L1000 430 L0 430 Z"
            fill="#080d18"
          />
        </svg>

        {/* copy block */}
        <div className="absolute top-14 left-10 max-w-md xl:left-14">
          <p className="text-[11px] font-medium tracking-[0.22em] text-sky-300/90 uppercase">
            Learn anytime, go further
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-white xl:text-[2.75rem] xl:leading-[1.1]">
            Pick up where you left off.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            Every course, deadline and certificate — waiting exactly where you stopped.
          </p>
        </div>

        {/* floating glass cards — decorative mock data only */}
        <div className="absolute inset-0">
          {/* certificate earned — top right */}
          <div className="absolute top-[17%] right-[4%] w-60 rotate-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-400/15 text-sky-300">
                  <AwardIcon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium tracking-[0.08em] text-slate-400 uppercase">
                    Certificate earned
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-white">SQL Basics</p>
                </div>
              </div>
              <AwardIcon className="mt-0.5 size-8 text-sky-400/50" />
            </div>
            <p className="mt-3 border-t border-white/10 pt-2.5 text-xs leading-4 text-slate-400">
              Completed Sep 2026
            </p>
          </div>

          {/* continue learning — hero card, mid-left */}
          <div className="absolute top-[36%] left-[6%] w-80 rounded-xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.08em] text-slate-400 uppercase">
                <PlayIcon className="size-3" /> Continue learning
              </p>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-400/15 text-sky-300">
                <DatabaseIcon className="size-4.5" />
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">Advanced SQL</p>
            <p className="mt-0.5 text-xs leading-4 text-slate-400">
              Maya Chen · Databases · 4h 20m left
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full w-[68%] rounded-full bg-sky-400"
                  style={{ boxShadow: "0 0 10px rgba(96,165,250,0.9)" }}
                />
              </div>
              <span className="text-xs tabular-nums text-slate-300">68%</span>
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-sky-500 text-xs font-medium text-white"
            >
              Continue learning <ArrowRightIcon className="size-3.5" />
            </button>
          </div>

          {/* streak chip — mid right */}
          <div className="absolute top-[50%] right-[7%] flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] py-3 pr-4 pl-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-amber-400">
              <FlameIcon className="size-4" />
            </span>
            <div>
              <p className="text-xs leading-4 font-medium text-white">7-day streak</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                Nice work! 12 lessons done.
              </p>
            </div>
            <ChevronRightIcon className="size-4 text-slate-500" />
          </div>

          {/* upcoming assignment — lower left */}
          <div className="absolute top-[62%] left-[9%] flex w-72 -rotate-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-400/15 text-violet-300">
              <CalendarCheck2Icon className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium tracking-[0.08em] text-slate-400 uppercase">
                Upcoming assignment
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-white">Data Modeling Quiz</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                Due in 2 days · 10 questions
              </p>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-slate-500" />
          </div>

          {/* progress chip — right edge, partially clipped */}
          <div className="absolute top-[64%] -right-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pr-8 pl-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sky-400/15 text-sky-300">
              <BarChart3Icon className="size-4" />
            </span>
            <div>
              <p className="text-xs leading-4 font-medium text-white">Progress</p>
              <p className="text-[11px] leading-4 text-slate-400">builds possibilites.</p>
            </div>
          </div>

          {/* testimonial — bottom */}
          <figure className="absolute right-[10%] bottom-[7%] w-[380px] rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="flex gap-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-400/15 text-xs font-semibold text-sky-300">
                PK
              </span>
              <div>
                <blockquote className="text-sm leading-6 text-slate-200">
                  “Finished my onboarding track between meetings — the progress
                  bar kept me going.”
                </blockquote>
                <figcaption className="mt-2 text-xs leading-4 text-slate-400">
                  Priya · Support engineer
                </figcaption>
              </div>
            </div>
          </figure>
        </div>

        {/* vignette — softens edges */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(3,6,12,0.55) 100%)",
          }}
        />
      </aside>
    </div>
  );
}
