import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, sub, icon: Icon, loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: LucideIcon;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 pt-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-20" />
          ) : (
            <p key={String(value)} className="mt-1 text-2xl font-semibold tabular-nums tracking-tight animate-in fade-in slide-in-from-bottom-0.5 duration-(--duration-moderate)">
              {value}
            </p>
          )}
          {sub && !loading && (
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        {Icon && (
          <div className="grid size-8 shrink-0 place-items-center rounded-md border bg-muted/40 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
