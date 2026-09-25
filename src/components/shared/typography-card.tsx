"use client";

import { RotateCcwIcon } from "lucide-react";
import {
  effectiveSize, SIZE_LABELS, SIZE_ORDER, TYPE_GROUPS,
  type TypeGroup, type TypeSize, type UiPreferences,
} from "@/lib/ui-preferences";
import { useUiPrefs } from "@/components/shared/app-shell/ui-prefs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TYPE_SECTIONS = ["Navigation", "Content", "Data & forms"];

/**
 * Per-user typography preferences — shared by admin settings and learner
 * profile. Reads/writes through whichever UiPrefsProvider is mounted above.
 */
export function TypographyCard({ description }: { description: string }) {
  const { prefs, setSize, resetAll } = useUiPrefs();
  const hasOverrides = Object.keys(prefs.typography ?? {}).length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">Typography &amp; readability</CardTitle>
        <Badge variant="secondary">Personal</Badge>
      </CardHeader>
      <CardContent className="flex flex-col">
        <p className="-mt-1 mb-2 text-(length:--fs-meta) leading-4 text-muted-foreground">
          {description}
        </p>
        {TYPE_SECTIONS.map((section) => (
          <div key={section}>
            <p className="border-b pb-1 pt-3 text-(length:--fs-meta) leading-4 font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {section}
            </p>
            {TYPE_GROUPS.filter((g) => g.section === section).map((g) => (
              <TypeRow key={g.key} group={g} prefs={prefs} onChange={setSize} />
            ))}
          </div>
        ))}
        <div className="flex justify-end pt-3">
          <Button variant="ghost" size="sm" onClick={resetAll} disabled={!hasOverrides}>
            <RotateCcwIcon /> Reset typography to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeRow({
  group, prefs, onChange,
}: {
  group: TypeGroup;
  prefs: UiPreferences;
  onChange: (key: string, size: TypeSize) => void;
}) {
  const current = effectiveSize(group.key, prefs);
  return (
    <div className="flex items-center justify-between gap-6 border-b py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{group.label}</p>
        <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">{group.hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {current !== "default" && (
          <Button
            variant="ghost" size="icon-xs" title="Reset to product default"
            onClick={() => onChange(group.key, "default")}
          >
            <RotateCcwIcon />
          </Button>
        )}
        <Select value={current} onValueChange={(v) => onChange(group.key, v as TypeSize)}>
          <SelectTrigger className="w-44" aria-label={`${group.label} size`}>
            <SelectValue>
              {(v: TypeSize) => (
                <span className="flex items-baseline gap-1.5">
                  <span>{SIZE_LABELS[v]}</span>
                  <span className="text-(length:--fs-meta) leading-4 tabular-nums text-muted-foreground">{group.px[v]}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-56 min-w-0" alignItemWithTrigger={false}>
            {SIZE_ORDER.map((s) => (
              <SelectItem key={s} value={s} className="py-1.5">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-foreground">{SIZE_LABELS[s]}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-(length:--fs-meta) leading-4 tabular-nums text-muted-foreground">{group.px[s]}</span>
                    {s === "default" && (
                      <Badge variant="secondary" className="h-4.5 px-1.5 text-[10px] font-medium">
                        Default
                      </Badge>
                    )}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
