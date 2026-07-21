import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  AlertTriangle, ArrowUpRight, Wallet, CheckSquare, Refrigerator, ShoppingBag,
  LineChart as LineChartIcon, Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { FinanceMiniChart } from "@/components/atlas/FinanceMiniChart";
import {
  usePantry, useTasks, daysUntil,
} from "@/lib/atlas-data";
import { useFinanceSummary, SERIES_COLOR, CATEGORY_LABELS } from "@/lib/finance-summary";
import { useSavedLocation, useWeather, weatherCondition } from "@/hooks/useWeather";
import { PrivacyGuard, usePrivacyMode } from "@/context/PrivacyMode";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Atlas" },
      { name: "description", content: "What needs your attention today — finances, food, tasks, and weather at a glance." },
    ],
  }),
  component: Dashboard,
});

// --- Greetings -----------------------------------------------------------
const GREETINGS = {
  morning: ["Good morning.", "Morning, Aaron.", "Welcome back.", "Systems online."],
  afternoon: ["Good afternoon.", "Welcome back, Aaron.", "Good to see you."],
  evening: ["Good evening.", "Evening, Aaron.", "Welcome home.", "Good to see you again."],
};

function pickGreeting() {
  const h = new Date().getHours();
  const bucket = h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  const pool = GREETINGS[bucket];
  const seed = Math.floor(Date.now() / (1000 * 60 * 60));
  return pool[seed % pool.length];
}

// --- Rotating header status ---------------------------------------------
const STATUS_MESSAGES = [
  "ATLAS ONLINE", "ATLAS AWAKE", "SYSTEM READY", "STANDING BY", "READY",
  "OPERATIONAL", "CONNECTION ESTABLISHED", "READY FOR TODAY",
  "Welcome back.", "Good to see you again.", "Ready when you are.", "Let's get organized.",
  "Awaiting Instructions", "Monitoring Active", "Command Link Established",
  "Atlas has been expecting you.", "Welcome home.", "Another successful boot.",
  "Everything's where you left it.", "Your life, organized.", "One dashboard. Everything else.",
];

function pickStatus() {
  return STATUS_MESSAGES[Math.floor(Math.random() * STATUS_MESSAGES.length)];
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtCents = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function weatherIcon(code: number, cls = "size-8") {
  const c = weatherCondition(code).icon;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "storm") return <CloudLightning className={cls} />;
  if (c === "cloud") return <Cloud className={cls} />;
  return <Sun className={`${cls} text-primary`} />;
}

function Dashboard() {
  const pantry = usePantry();
  const tasks = useTasks();
  const { location } = useSavedLocation();
  const weather = useWeather(location);
  const { mode } = usePrivacyMode();
  const finance = useFinanceSummary();

  // ---- Derived (kept small; only what the widgets need) ----
  const expiring = useMemo(() =>
    (pantry.data ?? [])
      .map((p) => ({ item: p, days: daysUntil(p.expires_on) }))
      .filter((x) => x.days !== null && x.days <= 5)
      .sort((a, b) => (a.days ?? 99) - (b.days ?? 99)),
    [pantry.data],
  );

  const openTasks = (tasks.data ?? []).filter((t) => !t.is_done);
  const todayTasks = openTasks.filter((t) => t.kind !== "shopping").slice(0, 5);
  const shopping = openTasks.filter((t) => t.kind === "shopping");

  // ---- Atlas Briefing: dynamic, high-signal only ----
  const briefing = useMemo(() => {
    const items: { text: string; tone?: "warn" | "info" | "good" }[] = [];
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;

    if (mode === "private") {
      // Spending pace: only flag when spent% outpaces month progress by >20pts
      // AND we're past day 3 (avoid noise early in the month).
      if (dayOfMonth > 3 && finance.monthlyBudget > 0) {
        for (const code of ["HOU", "ESS", "FUN"] as const) {
          const spent = finance.spentByCode[code] ?? 0;
          const alloc = finance.allocByCode[code] ?? 0;
          if (alloc <= 0) continue;
          const spentPct = spent / alloc;
          if (spentPct >= 0.95) {
            items.push({ text: `${CATEGORY_LABELS[code].long} nearly spent — ${Math.round(spentPct * 100)}% of allocation.`, tone: "warn" });
          } else if (spentPct - monthProgress > 0.2) {
            items.push({ text: `${CATEGORY_LABELS[code].long} pace is high — ${Math.round(spentPct * 100)}% spent, ${Math.round(monthProgress * 100)}% through the month.`, tone: "warn" });
          }
        }
      }
      // Savings milestone: check if VAC/STS crossed a $500 threshold vs prior month.
      const prior = finance.summaries.at(-2);
      const latest = finance.summaries.at(-1);
      if (prior && latest) {
        for (const [code, key] of [
          ["VAC", "vac_balance"], ["STS", "sts_balance"], ["LTS", "lts_balance"], ["FED", "fed_balance"],
        ] as const) {
          const p = Math.floor(Number((prior as any)[key] ?? 0) / 500);
          const l = Math.floor(Number((latest as any)[key] ?? 0) / 500);
          if (l > p) {
            items.push({ text: `${CATEGORY_LABELS[code].long} passed ${fmt(l * 500)}.`, tone: "good" });
          }
        }
      }
    }

    // Pantry: only 0–2 day windows
    const urgent = expiring.filter((e) => (e.days ?? 99) <= 2);
    if (urgent.length) {
      const first = urgent[0];
      const others = urgent.length - 1;
      const when = first.days! < 0 ? `expired ${Math.abs(first.days!)}d ago` : first.days === 0 ? "expires today" : `expires in ${first.days}d`;
      items.push({
        text: others > 0
          ? `${first.item.name} ${when} · ${others} other item${others > 1 ? "s" : ""} also expiring soon.`
          : `${first.item.name} ${when}.`,
        tone: "warn",
      });
    }

    // Tasks: due today (not shopping)
    const dueToday = openTasks.filter((t) => t.kind !== "shopping" && daysUntil(t.due_on) === 0);
    const overdue = openTasks.filter((t) => t.kind !== "shopping" && (daysUntil(t.due_on) ?? 99) < 0);
    if (overdue.length) items.push({ text: `${overdue.length} task${overdue.length > 1 ? "s" : ""} overdue.`, tone: "warn" });
    else if (dueToday.length) items.push({ text: `${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due today.`, tone: "info" });

    // Weather: rain likely, unusual temps
    const today = weather.data?.daily[0];
    if (today) {
      if ((today.precipProb ?? 0) >= 60) {
        items.push({ text: `Rain likely today (${today.precipProb}%). Consider indoor plans.`, tone: "info" });
      } else if (today.tempMax >= 95) {
        items.push({ text: `Hot day ahead — high ${Math.round(today.tempMax)}°.`, tone: "info" });
      } else if (today.tempMin <= 32) {
        items.push({ text: `Freezing overnight — low ${Math.round(today.tempMin)}°.`, tone: "info" });
      }
    }

    return items;
  }, [finance, expiring, openTasks, weather.data, mode]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Command Center</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{pickGreeting()}</h1>
        </div>
        <Link to="/weather" className="text-right transition-opacity hover:opacity-80">
          <p className="flex items-center justify-end gap-2 text-4xl font-light tracking-tight">
            {weather.data ? weatherIcon(weather.data.now.code) : <Sun className="size-8 text-primary" />}
            {weather.data ? `${Math.round(weather.data.now.temperature)}°` : "—"}
            <span className="text-muted-foreground">{weather.data ? weatherCondition(weather.data.now.code).label : ""}</span>
          </p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            {weather.data ? ` · H ${Math.round(weather.data.daily[0].tempMax)}° / L ${Math.round(weather.data.daily[0].tempMin)}°` : ""}
          </p>
        </Link>
      </header>

      {/* Atlas Briefing */}
      <GlassCard className="border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Atlas Briefing</p>
            {briefing.length === 0 ? (
              <p className="text-lg text-muted-foreground">All systems nominal.</p>
            ) : (
              <ul className="space-y-1.5">
                {briefing.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-lg">
                    <span className={`mt-2 size-1.5 shrink-0 rounded-full ${
                      b.tone === "warn" ? "bg-warning" : b.tone === "good" ? "bg-success" : "bg-primary"
                    }`} />
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-12 gap-6">
        {/* Financial Core — summary only, mirrors Finances module */}
        <PrivacyGuard
          sensitivity="private-only"
          fallback={
            <GlassCard className="col-span-12 lg:col-span-8">
              <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                <Wallet className="size-8 opacity-40" />
                <p>Finance hidden in {mode === "guest" ? "Guest" : "Wall"} mode.</p>
              </div>
            </GlassCard>
          }
        >
          <GlassCard className="col-span-12 lg:col-span-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Financial Core</h2>
                <Link to="/money" className="text-xs text-primary hover:underline">Open Finances →</Link>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Net Worth</p>
                <p className="font-mono text-3xl font-bold">{fmt(finance.netWorth)}</p>
              </div>
            </div>

            {/* Key metrics grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricTile
                label="Current Budget"
                value={finance.budgetIsSet ? fmt(finance.monthlyBudget) : "—"}
                hint={finance.budgetIsSet ? `Based on ${finance.priorMonthLabel} income` : "Close prior month"}
              />
              <MetricTile
                label="Remaining"
                value={finance.budgetIsSet ? fmt(finance.remainingBudget) : "—"}
                hint={finance.budgetIsSet ? `${fmt(finance.monthlySpent)} spent` : ""}
                accent={finance.remainingBudget < 0 ? "var(--warning, #f59e0b)" : undefined}
              />
              <MetricTile
                label="Vacation Fund"
                sub="VAC"
                value={fmt(finance.balanceByCode.VAC)}
                accent={SERIES_COLOR.VAC}
              />
              <MetricTile
                label="Short-Term Savings"
                sub="STS"
                value={fmt(finance.balanceByCode.STS)}
                accent={SERIES_COLOR.STS}
              />
              <MetricTile
                label="Fidelity"
                sub="FED"
                value={fmt(finance.balanceByCode.FED)}
                accent={SERIES_COLOR.FED}
              />
              <MetricTile
                label="Long-Term Savings"
                sub="LTS"
                value={fmt(finance.balanceByCode.LTS)}
                accent={SERIES_COLOR.LTS}
              />
              <MetricTile
                label="Restricted Stock"
                sub="RSU"
                value={fmt(finance.balanceByCode.RSU)}
                accent={SERIES_COLOR.RSU}
              />
              <MetricTile
                label="Regions Checking"
                value={fmt(finance.balanceByCode.Regions)}
                accent={SERIES_COLOR.Regions}
              />
            </div>

            {/* Compact growth chart */}
            <Link to="/money" className="mt-6 block rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <LineChartIcon className="size-4" /> Investment &amp; Savings Growth
                </p>
                <span className="text-xs text-primary">Open full chart →</span>
              </div>
              <FinanceMiniChart summaries={finance.summaries} />
            </Link>
          </GlassCard>
        </PrivacyGuard>

        {/* Weather */}
        <Link to="/weather" className="col-span-12 lg:col-span-4">
          <GlassCard className="h-full transition-all hover:scale-[1.01]">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Forecast</p>
            {weather.data ? (
              <>
                <div className="flex items-center gap-4">
                  {weatherIcon(weather.data.now.code, "size-16")}
                  <div>
                    <p className="text-5xl font-light">{Math.round(weather.data.now.temperature)}°</p>
                    <p className="text-sm text-muted-foreground">{weatherCondition(weather.data.now.code).label}</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-2 overflow-x-auto">
                  {weather.data.hourly.slice(0, 6).map((h) => (
                    <div key={h.time} className="flex flex-col items-center rounded-xl bg-white/5 px-3 py-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{new Date(h.time).toLocaleTimeString("en-US", { hour: "numeric" })}</span>
                      <div className="my-1 size-4 text-primary">{weatherIcon(h.code, "size-4")}</div>
                      <span className="font-mono text-sm">{Math.round(h.temp)}°</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Loading weather…</p>
            )}
          </GlassCard>
        </Link>

        {/* Tasks */}
        <GlassCard className="col-span-12 md:col-span-6 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-xl font-semibold">Today's Focus</h2>
            <Link to="/tasks" className="text-xs text-primary hover:underline">All →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyLink to="/tasks" icon={CheckSquare} text="No tasks. Add one." />
          ) : (
            <ul className="space-y-4">
              {todayTasks.map((t) => {
                const d = daysUntil(t.due_on);
                return (
                  <li key={t.id} className="flex items-start gap-4">
                    <div className={`mt-1 size-6 shrink-0 rounded-md border-2 ${t.priority === "high" ? "border-primary" : "border-white/20"}`} />
                    <div className="min-w-0">
                      <p className="text-lg font-medium leading-tight">{t.title}</p>
                      {(t.priority === "high" || t.due_on) && (
                        <p className="text-sm text-muted-foreground">
                          {t.priority === "high" ? "High" : ""}
                          {t.priority === "high" && t.due_on ? " · " : ""}
                          {t.due_on ? (d === 0 ? "Today" : d! < 0 ? `${Math.abs(d!)}d overdue` : `${d}d`) : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        {/* Pantry */}
        <GlassCard className="col-span-12 md:col-span-6 lg:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pantry Intelligence</h2>
            <Link to="/pantry" className="text-xs text-primary hover:underline">All →</Link>
          </div>
          {expiring.length === 0 ? (
            <EmptyLink to="/pantry" icon={Refrigerator} text="Nothing expiring soon." />
          ) : (
            <div className="grid gap-3">
              {expiring.slice(0, 4).map(({ item, days }) => {
                const urgent = (days ?? 99) <= 1;
                return (
                  <div key={item.id} className={`flex items-center justify-between rounded-2xl border p-4 ${urgent ? "border-warning/30 bg-warning/10" : "border-white/5 bg-white/5"}`}>
                    <div>
                      <p className="text-lg font-medium">{item.name}</p>
                      <p className={`font-mono text-xs uppercase ${urgent ? "text-warning" : "text-muted-foreground"}`}>
                        {days! < 0 ? `Expired ${Math.abs(days!)}d ago` : days === 0 ? "Expiring today" : `Expiring in ${days}d`}
                      </p>
                    </div>
                    {urgent && <AlertTriangle className="size-5 text-warning" />}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Shopping */}
        <GlassCard className="col-span-12 md:col-span-6 lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Shopping</h2>
            <Link to="/tasks" className="text-xs text-primary hover:underline">Open →</Link>
          </div>
          {shopping.length === 0 ? (
            <EmptyLink to="/tasks" icon={ShoppingBag} text="Nothing to buy." />
          ) : (
            <ul className="space-y-2">
              {shopping.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="flex-1 truncate">{s.title.replace(/^buy\s+/i, "")}</span>
                  {s.quantity && <span className="font-mono text-[10px] text-muted-foreground">{s.quantity}{s.unit ? ` ${s.unit}` : ""}</span>}
                </li>
              ))}
              {shopping.length > 6 && (
                <li className="text-xs text-muted-foreground">+{shopping.length - 6} more</li>
              )}
            </ul>
          )}
        </GlassCard>
      </div>
      {/* preserve unused fmtCents import for future ledger widgets */}
      <span className="hidden">{fmtCents(0)}</span>
    </div>
  );
}

function MetricTile({
  label, sub, value, hint, accent,
}: { label: string; sub?: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        {accent && <span className="size-2 rounded-full" style={{ background: accent }} />}
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      {sub && <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">{sub}</p>}
      <p className="mt-2 font-mono text-xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyLink({ to, icon: Icon, text }: { to: string; icon?: typeof Wallet; text: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-muted-foreground hover:bg-white/5">
      {Icon ? <Icon className="size-8 opacity-40" /> : null}
      <p>{text}</p>
    </Link>
  );
}
