"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { SIDEBAR_TRANSITION_MS } from "@/components/ui/sidebar";

/** Recharts bodies — lazy-loaded so recharts stays out of the page bundle.
 *  debounce throttles RO relayouts during the sidebar's width animation. */

export function SeriesAreaChart({
  title,
  data,
  color,
}: {
  title: string;
  data?: { date: string; n: number }[];
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220} debounce={SIDEBAR_TRANSITION_MS / 2}>
      <AreaChart data={data} margin={{ top: 4, right: 8 }}>
        <defs>
          <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} stroke="var(--muted-foreground)" />
        <YAxis width={36} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <Tooltip />
        <Area dataKey="n" stroke={color} fill={`url(#g-${title})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EngagementBarChart({
  data,
}: {
  data: { type: string; n: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240} debounce={SIDEBAR_TRANSITION_MS / 2}>
      <BarChart data={data.map((r) => ({ ...r, name: r.type.replace(/_/g, " ") }))} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
        <Tooltip />
        <Bar dataKey="n" fill="var(--color-chart-3)" radius={3} />
      </BarChart>
    </ResponsiveContainer>
  );
}
