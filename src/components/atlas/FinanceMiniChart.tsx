import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SERIES_COLOR, monthLabel } from "@/lib/finance-summary";
import type { MonthlySummary } from "@/lib/atlas-data";

const CHART = {
  axis: "rgba(226, 232, 240, 0.7)",
  grid: "rgba(255, 255, 255, 0.08)",
  tooltipBg: "rgba(15, 20, 34, 0.95)",
  tooltipBorder: "rgba(255, 255, 255, 0.18)",
};

const SERIES: (keyof typeof SERIES_COLOR)[] = ["FED", "LTS", "RSU", "VAC", "STS"];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function FinanceMiniChart({
  summaries,
  compact = false,
}: {
  summaries: MonthlySummary[];
  compact?: boolean;
}) {
  const rows = useMemo(
    () =>
      summaries.map((s) => ({
        date: monthLabel(s.month),
        FED: Number(s.fed_balance),
        LTS: Number(s.lts_balance),
        RSU: Number((s as any).rsu_balance ?? 0),
        VAC: Number(s.vac_balance),
        STS: Number(s.sts_balance),
      })),
    [summaries],
  );

  const height = compact ? "h-24" : "h-40";

  if (rows.length === 0) {
    return (
      <div className={`flex ${height} items-center justify-center text-xs text-muted-foreground`}>
        No history yet.
      </div>
    );
  }

  // Show only first & last tick when compact to reduce axis clutter.
  const xTicks = compact && rows.length > 2 ? [rows[0].date, rows[rows.length - 1].date] : undefined;

  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="date"
            stroke={CHART.axis}
            tick={{ fill: CHART.axis, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            ticks={xTicks}
            interval={compact ? "preserveStartEnd" : 0}
          />
          <YAxis
            stroke={CHART.axis}
            tick={{ fill: CHART.axis, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={compact ? 32 : 44}
            tickCount={compact ? 3 : 5}
          />
          <Tooltip
            contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 12, color: "#f8fafc", fontSize: 12 }}
            formatter={(v: any, k: any) => [fmt(Number(v)), k]}
          />
          {SERIES.map((k) => (
            <Line key={k} type="monotone" dataKey={k} stroke={SERIES_COLOR[k]} strokeWidth={compact ? 1.5 : 2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {SERIES.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: SERIES_COLOR[k] }} />
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
