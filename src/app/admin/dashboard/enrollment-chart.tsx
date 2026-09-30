"use client";

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { EnrollmentSeriesPoint } from "@/lib/types";
import { SIDEBAR_TRANSITION_MS } from "@/components/ui/sidebar";

/** Recharts chart body — lazy-loaded so the lib stays out of the page bundle. */
export default function EnrollmentChart({ data }: { data: EnrollmentSeriesPoint[] }) {
  return (
    // Sidebar collapse animates this card's width for 200ms; without a bound
    // the RO fires per frame → ~15 full chart relayouts → the collapse janks.
    <ResponsiveContainer
      width="100%"
      height="100%"
      debounce={SIDEBAR_TRANSITION_MS / 2}
    >
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="enr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)", border: "1px solid var(--border)",
            borderRadius: 8, fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={1.8} fill="url(#enr)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
