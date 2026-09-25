"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Table state lives in the URL — shareable, back-button friendly.
 * Reads: page, pageSize, q, sort, order, + arbitrary filter keys.
 */
export function useTableParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo(
    () => Object.fromEntries(searchParams.entries()) as Record<string, string>,
    [searchParams]
  );

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Number(params.pageSize) || 20;
  const q = params.q ?? "";
  const sort = params.sort;
  const order = params.order === "asc" ? ("asc" as const) : ("desc" as const);

  const setParams = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === null || v === "") sp.delete(k);
        else sp.set(k, String(v));
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Any filter/search/sort change resets to page 1.
  const setFilter = useCallback(
    (updates: Record<string, string | number | undefined | null>) =>
      setParams({ ...updates, page: undefined }),
    [setParams]
  );

  const toggleSort = useCallback(
    (key: string) => {
      if (sort !== key) setParams({ sort: key, order: "asc", page: undefined });
      else if (order === "asc") setParams({ sort: key, order: "desc", page: undefined });
      else setParams({ sort: undefined, order: undefined, page: undefined });
    },
    [sort, order, setParams]
  );

  return { params, page, pageSize, q, sort, order, setParams, setFilter, toggleSort };
}
