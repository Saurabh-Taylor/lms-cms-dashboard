"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

/** Always-on banner while an admin persona-previews the portal — exit is the only action. */
export function PreviewBanner({ persona }: { persona: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const exit = async () => {
    setBusy(true);
    try {
      await api("/api/preview", { method: "DELETE" });
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't exit preview");
      setBusy(false);
    }
  };
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-primary px-4 py-1.5 text-(length:--fs-meta) font-medium text-primary-foreground">
      <span>
        You&apos;re previewing the {persona} portal as yourself — actions affect your own account.
      </span>
      <button
        type="button"
        onClick={exit}
        disabled={busy}
        className="rounded-md bg-primary-foreground/15 px-2.5 py-0.5 font-semibold transition-colors duration-(--duration-fast) hover:bg-primary-foreground/25 disabled:opacity-60"
      >
        {busy ? "Exiting…" : "Exit preview"}
      </button>
    </div>
  );
}
