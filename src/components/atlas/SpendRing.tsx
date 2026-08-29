// Budget spend ring — a donut chart of this month's outflow by category,
// with the net gained/lost figure above it. Fed directly from the live finance
// summary, so a new or edited transaction re-renders it instantly.
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SERIES_COLOR, CATEGORY_LABELS } from "@/lib/finance-summary";
import { maskMoney, isMoneyMasked } from "@/lib/privacy-mask";

export const RING_CODES = ["HOU", "ESS", "FUN", "VAC", "STS", "LTS"] as const;

const REMAINING_COLOR = "rgba(255,255,255,0.07)";

export function SpendRing({
  outflowByCode,
  basis,
  netGainLoss,
  cents = false,
  compact = false,
}: {
  outflowByCode: Record<string, number>;
  /** Total money the ring is measured against (last month's income). */
  basis: number;
  netGainLoss: number;
  cents?: boolean;
  compact?: boolean;
}) {
  const fmt = (n: number) =>
    maskMoney(
      n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0,
      }),
    );

  const { slices, spent, pct } = useMemo(() => {
    const s = RING_CODES.map((code) => ({
      code,
      name: CATEGORY_LABELS[code]?.long ?? code,
      value: Math.max(0, outflowByCode[code] ?? 0),
    })).filter((d) => d.value > 0);
    const total = s.reduce((a, b) => a + b.value, 0);
    const remaining = Math.max(0, basis - total);
    const data = remaining > 0 ? [...s, { code: "__rest", name: "Unspent", value: remaining }] : s;
    return { slices: data, spent: total, pct: basis > 0 ? Math.min(999, (total / basis) * 100) : 0 };
  }, [outflowByCode, basis]);

  const masked = isMoneyMasked();
  const gain = netGainLoss >= 0;
  const size = compact ? "h-[168px]" : "h-[220px]";

  return (
    <div className="flex h-full flex-col">
      <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {gain ? "Net gained" : "Net lost"}
        </p>
        <p
          className="font-mono text-2xl font-bold"
          style={{ color: gain ? SERIES_COLOR.FED : "var(--warning, #f59e0b)" }}
        >
          {gain ? "" : "−"}
          {fmt(Math.abs(netGainLoss))}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {fmt(basis)} income − {fmt(spent)} spent
        </p>
      </div>

      {masked ? (
        <div className={`mt-3 flex ${size} items-center justify-center rounded-xl border border-white/5 text-xs text-muted-foreground`}>
          Chart hidden in Guest mode.
        </div>
      ) : slices.length === 0 ? (
        <div className={`mt-3 flex ${size} items-center justify-center text-xs text-muted-foreground`}>
          No spending yet this month.
        </div>
      ) : (
        <div className={`relative mt-2 ${size} w-full`}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="66%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={1.5}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((d) => (
                  <Cell
                    key={d.code}
                    fill={d.code === "__rest" ? REMAINING_COLOR : SERIES_COLOR[d.code] ?? REMAINING_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 20, 34, 0.95)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 12,
                  color: "#f8fafc",
                  fontSize: 12,
                }}
                formatter={(v: any, n: any) => [fmt(Number(v)), n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono text-xl font-bold">{pct.toFixed(0)}%</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">spent</p>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {RING_CODES.filter((c) => (outflowByCode[c] ?? 0) > 0).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: SERIES_COLOR[c] }} />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
