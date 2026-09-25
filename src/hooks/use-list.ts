"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api-client";
import type { ListResponse } from "@/lib/types";

/** Generic server-paginated list fetcher. */
export function useList<T>(endpoint: string, params: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: [endpoint, params],
    queryFn: () => api<ListResponse<T>>(`${endpoint}${qs(params)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useDetail<T>(endpoint: string | null) {
  return useQuery({
    queryKey: [endpoint],
    queryFn: () => api<T>(endpoint!),
    enabled: !!endpoint,
  });
}
