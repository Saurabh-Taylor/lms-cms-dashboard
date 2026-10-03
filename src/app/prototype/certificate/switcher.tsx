"use client";

// PROTOTYPE — floating variant switcher (#102). Hidden in prod builds.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idx = Math.max(0, variants.findIndex((v) => v.key === current));

  const go = (next: number) => {
    const k = variants[(next + variants.length) % variants.length].key;
    const p = new URLSearchParams(searchParams.toString());
    p.set("variant", k);
    router.replace(`?${p.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(idx - 1);
      if (e.key === "ArrowRight") go(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (process.env.NODE_ENV === "production") return null;

  const v = variants[idx];
  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-foreground px-2 py-1.5 text-background shadow-xl print:hidden">
      <button
        onClick={() => go(idx - 1)}
        className="grid size-7 place-items-center rounded-full hover:bg-background/20"
        aria-label="Previous variant"
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="min-w-40 text-center text-xs font-medium">
        Variant {v.key} — {v.name}
      </span>
      <button
        onClick={() => go(idx + 1)}
        className="grid size-7 place-items-center rounded-full hover:bg-background/20"
        aria-label="Next variant"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
