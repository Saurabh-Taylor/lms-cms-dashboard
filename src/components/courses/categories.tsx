"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { OptionItem } from "@/lib/types";

/**
 * Category options query — cached under the shared "options" key family so
 * the two consumers (create dialog, settings form) hit one cache entry.
 * `enabled` gates the fetch for mounted-but-closed dialogs; a reopen serves
 * the cache instantly and revalidates in the background.
 * `loaded` only marks a successful fetch — a failure surfaces as `error` so
 * callers never render an empty-state hint for a request that didn't
 * actually return empty.
 */
export function useCategories(enabled = true) {
  const q = useQuery({
    queryKey: ["options", "categories"],
    queryFn: () => api<OptionItem[]>("/api/admin/options?resource=categories"),
    enabled,
  });
  return { categories: q.data ?? [], loaded: q.isSuccess, error: q.isError };
}

/** Hint row for the category select's empty/failed states. */
export function CategoryHint({ loaded, error, empty }: {
  loaded: boolean;
  error: boolean;
  empty: boolean;
}) {
  if (error)
    return <p className="flex h-8 items-center text-xs text-muted-foreground">Couldn&apos;t load categories.</p>;
  if (!loaded || !empty) return null;
  return (
    <p className="flex h-8 items-center text-xs text-muted-foreground">
      No categories yet —{" "}
      <Link href="/admin/categories" className="text-primary underline-offset-2 hover:underline">
        create one first
      </Link>
      , or leave blank.
    </p>
  );
}
