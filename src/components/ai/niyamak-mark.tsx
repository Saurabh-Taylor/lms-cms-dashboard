import { cn } from "@/lib/utils";

/**
 * Niyamak mark — an eight-spoked chakra (wheel of governance).
 * Rotates slowly while a run is active: motion as state indication.
 */
export function NiyamakMark({ className, active }: { className?: string; active?: boolean }) {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(className, active && "motion-safe:animate-[spin_4s_linear_infinite]")}
    >
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      {spokes.map((a) => (
        <line
          key={a}
          x1={12 + 2.6 * Math.cos(a)}
          y1={12 + 2.6 * Math.sin(a)}
          x2={12 + 7.4 * Math.cos(a)}
          y2={12 + 7.4 * Math.sin(a)}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
