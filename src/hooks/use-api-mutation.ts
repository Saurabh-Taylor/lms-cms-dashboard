"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * The app-standard mutation: call api(), toast the error, toast+invalidate
 * on success. Callers declare only the variable parts — the request, which
 * query keys go stale, and what "done" looks like.
 *
 *   const save = useApiMutation({
 *     mutationFn: () => api("/api/admin/categories", { method: "POST", body }),
 *     invalidate: [["/api/admin/categories"]],
 *     successToast: "Category created",
 *     onSuccess: () => onOpenChange(false),
 *   });
 *
 * Conditional/non-success outcomes (partial bulk failures, warnings) belong
 * in `onSuccess` — omit `successToast` and toast there instead.
 */
export interface ApiMutationOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Query keys invalidated after success — each entry is a full queryKey. "all" invalidates everything. */
  invalidate?: QueryKey[] | "all";
  /** Success toast — static string or computed from (data, vars). */
  successToast?: string | ((data: TData, vars: TVars) => string | undefined);
  /** Extra success work — close dialogs, reset state, router.refresh(). */
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Error toast — default is error.message; string/fn to override, false to silence. */
  errorToast?: string | false | ((error: Error, vars: TVars) => string | undefined);
  /** Runs after the error toast — extra state recovery only. */
  onError?: (error: Error, vars: TVars) => void;
}

export function useApiMutation<TData = unknown, TVars = void>(
  opts: ApiMutationOptions<TData, TVars>,
) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVars>({
    mutationFn: opts.mutationFn,
    onSuccess: (data, vars) => {
      const msg =
        typeof opts.successToast === "function"
          ? opts.successToast(data, vars)
          : opts.successToast;
      if (msg) toast.success(msg);
      if (opts.invalidate === "all") qc.invalidateQueries();
      else for (const key of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: key });
      opts.onSuccess?.(data, vars);
    },
    onError: (error, vars) => {
      const et = opts.errorToast;
      const msg =
        et === false
          ? undefined
          : typeof et === "function"
            ? et(error, vars)
            : (et ?? error.message);
      if (msg) toast.error(msg);
      opts.onError?.(error, vars);
    },
  });
}
