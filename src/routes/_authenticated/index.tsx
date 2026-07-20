import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  AlertTriangle, Plane, ChefHat, ArrowUpRight, Wallet, CheckSquare, Refrigerator, ShoppingBasket,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import {
  useAccounts, useTransactions, useBudgets, usePantry, useTasks, useGrocery,
  accountBalance, budgetSpent, daysUntil,
} from "@/lib/atlas-data";
import { useSavedLocation, useWeather, weatherCondition } from "@/hooks/useWeather";
import { PrivacyGuard, usePrivacyMode } from "@/context/PrivacyMode";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Atlas" },
      { name: "description", content: "Your daily command center: finances, tasks, pantry, and more." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
  const accounts = useAccounts();
  const txns = useTransactions(20);
  const budgets = useBudgets();
  const pantry = usePantry();
  const tasks = useTasks();
  const grocery = useGrocery();
  const { location } = useSavedLocation();
  const weather = useWeather(location);
  const { mode } = usePrivacyMode();

  const netWorth = useMemo(
    () => (accounts.data ?? []).reduce((s, a) => s + accountBalance(a, txns.data ?? []), 0),
    [accounts.data, txns.data],
  );

  const expiring = (pantry.data ?? [])
    .map((p) => ({ item: p, days: daysUntil(p.expires_on) }))
    .filter((x) => x.days !== null && x.days <= 5)
    .slice(0, 4);

  const todayTasks = (tasks.data ?? [])
    .filter((t) => !t.is_done)
    .slice(0, 5);

  const briefingItems = useMemo(() => {
    const out: string[] = [];
    if (expiring.some((e) => (e.days ?? 0) <= 1)) out.push(`${expiring.filter((e) => (e.days ?? 0) <= 1).length} pantry item(s) expiring today.`);
    const highPri = (tasks.data ?? []).filter((t) => !t.is_done && t.priority === "high").length;
    if (highPri) out.push(`${highPri} high-priority task${highPri > 1 ? "s" : ""} open.`);
    const overBudget = (budgets.data ?? []).filter((b) => budgetSpent(b, txns.data ?? []) >= Number(b.monthly_limit) && Number(b.monthly_limit) > 0).length;
    if (overBudget && mode === "private") out.push(`${overBudget} budget${overBudget > 1 ? "s" : ""} over limit.`);
    if (weather.data?.daily[0]?.precipProb && weather.data.daily[0].precipProb >= 60) out.push(`Rain likely today (${weather.data.daily[0].precipProb}%).`);
    if (!out.length) out.push("All systems nominal. No urgent signals.");
    return out;
  }, [expiring, tasks.data, budgets.data, txns.data, weather.data, mode]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Systems Nominal</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{greeting()}.</h1>
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

      {/* AI Briefing */}
      <GlassCard className="border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Atlas Briefing</p>
            <ul className="space-y-1.5 text-lg">
              {briefingItems.map((b, i) => <li key={i}>· {b}</li>)}
            </ul>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-12 gap-6">
        {/* Financial Core */}
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
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Financial Core</h2>
                <Link to="/money" className="text-xs text-primary hover:underline">Open Money →</Link>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Net Worth</p>
                <p className="font-mono text-3xl font-bold">{fmt(netWorth)}</p>
              </div>
            </div>
            {(accounts.data ?? []).length === 0 ? (
              <EmptyLink to="/money" text="Add your first account to see balances." />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {accounts.data!.slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-2xl bg-white/5 p-5">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{a.name}</p>
                    <p className="mt-2 font-mono text-2xl font-bold tracking-tight">{fmt(accountBalance(a, txns.data ?? []))}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.institution ?? a.type}</p>
                  </div>
                ))}
              </div>
            )}
            {(budgets.data ?? []).length > 0 && (
              <div className="mt-8 border-t border-white/5 pt-6">
                <h3 className="mb-4 text-sm font-medium text-muted-foreground">Budget Progress</h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  {budgets.data!.slice(0, 6).map((c) => {
                    const spent = budgetSpent(c, txns.data ?? []);
                    const pct = Number(c.monthly_limit) > 0 ? Math.min(100, (spent / Number(c.monthly_limit)) * 100) : 0;
                    return (
                      <div key={c.id}>
                        <div className="mb-1.5 flex items-baseline justify-between text-sm">
                          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{c.code} · {c.name}</span>
                          <span className="font-mono text-xs">{fmt(spent)} / {fmt(Number(c.monthly_limit))}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                          <div className={`h-full transition-all ${pct >= 100 ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </GlassCard>
        </PrivacyGuard>

        {/* Weather / Forecast quick */}
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
            <h2 className="text-xl font-semibold">Daily Protocols</h2>
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
              {expiring.map(({ item, days }) => {
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

        {/* Grocery */}
        <GlassCard className="col-span-12 md:col-span-6 lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Grocery</h2>
            <Link to="/grocery" className="text-xs text-primary hover:underline">Open →</Link>
          </div>
          {(grocery.data ?? []).filter((g) => !g.is_checked).length === 0 ? (
            <EmptyLink to="/grocery" icon={ShoppingBasket} text="List empty." />
          ) : (
            <ul className="space-y-2">
              {(grocery.data ?? []).filter((g) => !g.is_checked).slice(0, 6).map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {g.name}
                </li>
              ))}
              {(grocery.data ?? []).filter((g) => !g.is_checked).length > 6 && (
                <li className="text-xs text-muted-foreground">+{(grocery.data ?? []).filter((g) => !g.is_checked).length - 6} more</li>
              )}
            </ul>
          )}
        </GlassCard>

        {/* Atlas Feed (recent activity) */}
        <PrivacyGuard
          sensitivity="private-only"
          fallback={null}
        >
          <GlassCard className="col-span-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Atlas Feed</h2>
              <Link to="/money" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View All <ArrowUpRight className="size-4" />
              </Link>
            </div>
            {(txns.data ?? []).length === 0 ? (
              <EmptyLink to="/money" text="No activity yet." />
            ) : (
              <div className="space-y-1">
                {(txns.data ?? []).slice(0, 8).map((t) => {
                  const acc = accounts.data?.find((a) => a.id === t.account_id);
                  const cat = budgets.data?.find((b) => b.id === t.category_id);
                  return (
                    <div key={t.id} className="grid grid-cols-[80px_1fr_1fr_120px] items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/5">
                      <span className="font-mono text-xs uppercase text-muted-foreground">
                        {new Date(t.occurred_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className="font-medium">{t.merchant}</span>
                      <span className="text-sm text-muted-foreground">{cat?.code ?? "—"} · {acc?.name ?? "—"}</span>
                      <span className={`text-right font-mono ${t.type === "income" ? "text-success" : "text-foreground"}`}>
                        {t.type === "income" ? "+" : "-"}{fmtCents(Math.abs(Number(t.amount)))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </PrivacyGuard>
      </div>
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

// Suppress unused warning for Plane / ChefHat imports (kept for future modules)
void Plane; void ChefHat;
