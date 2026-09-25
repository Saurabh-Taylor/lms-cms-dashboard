"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  adminShellVars,
  type TypeSize,
  type UiPreferences,
} from "@/lib/ui-preferences";

interface UiPrefsCtx {
  prefs: UiPreferences;
  setSize: (key: string, size: TypeSize) => void;
  resetAll: () => void;
}

const UiPrefsContext = React.createContext<UiPrefsCtx | null>(null);

export function useUiPrefs(): UiPrefsCtx {
  const ctx = React.useContext(UiPrefsContext);
  if (!ctx) throw new Error("useUiPrefs must be used inside a UiPrefsProvider");
  return ctx;
}

/**
 * Personal typography overrides for the signed-in user — portal-agnostic.
 * `endpoint` is the portal's own me/preferences route (/api/admin/me,
 * /api/learner/me); each persists sparse overrides to users.ui_preferences.
 */
export function UiPrefsProvider({
  initial,
  endpoint,
  children,
}: {
  initial: UiPreferences;
  endpoint: string;
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = React.useState<UiPreferences>(initial);

  // <html> carries the vars from SSR; keep them in sync after client-side changes
  // so portal-rendered popups (dropdowns, dialogs) pick them up too
  React.useEffect(() => {
    const vars = adminShellVars(prefs);
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  }, [prefs]);

  const persist = useMutation({
    mutationFn: (typography: Record<string, string>) =>
      api(endpoint, { method: "PATCH", body: JSON.stringify({ typography }) }),
  });

  const commit = (next: UiPreferences, revertTo: UiPreferences) => {
    setPrefs(next);
    persist.mutate(next.typography ?? {}, {
      onError: (e) => {
        setPrefs(revertTo);
        toast.error("Couldn't save your typography preference — previous setting restored.", {
          description: e.message,
        });
      },
    });
  };

  const ctx: UiPrefsCtx = {
    prefs,
    setSize: (key, size) => {
      const typography = { ...(prefs.typography ?? {}) };
      if (size === "default") delete typography[key];
      else if (typography[key] === size) return;
      else typography[key] = size;
      commit({ typography }, prefs);
    },
    resetAll: () => commit({}, prefs),
  };

  return <UiPrefsContext.Provider value={ctx}>{children}</UiPrefsContext.Provider>;
}
