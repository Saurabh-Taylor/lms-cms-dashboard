import { format, formatDistanceToNow } from "date-fns";

export function fmtDate(v: number | Date | null | undefined, pattern = "MMM d, yyyy") {
  if (v == null) return "—";
  return format(new Date(v), pattern);
}

export function fmtRelative(v: number | Date | null | undefined) {
  if (v == null) return "—";
  return formatDistanceToNow(new Date(v), { addSuffix: true });
}

export function fmtDateTime(v: number | Date | null | undefined) {
  if (v == null) return "—";
  return format(new Date(v), "MMM d, yyyy · HH:mm");
}

export function fmtDuration(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fmtBytes(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
