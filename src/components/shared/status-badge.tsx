import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  // success / green
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  sent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  passed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  // neutral / gray
  draft: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
  // warning / amber
  scheduled: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  invited: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  running: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  assigned: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  // danger / red
  suspended: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  disabled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  // info / blue
  unlisted: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium", STYLES[value] ?? "bg-muted text-muted-foreground border-border", className)}
    >
      {value.replace(/-/g, " ")}
    </Badge>
  );
}
