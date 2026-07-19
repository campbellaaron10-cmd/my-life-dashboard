import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/atlas/GlassCard";
import dinnerSalmon from "@/assets/dinner-salmon.jpg";
import {
  Sun,
  AlertTriangle,
  Plane,
  ChefHat,
  Zap,
  Wifi,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Atlas" },
      {
        name: "description",
        content: "Your daily command center: finances, tasks, pantry, and more.",
      },
    ],
  }),
  component: Dashboard,
});

const budgetCategories = [
  { code: "ESS", name: "Essentials", pct: 82, spent: 2100, limit: 2500, color: "bg-primary" },
  { code: "FUN", name: "Fun", pct: 45, spent: 450, limit: 1000, color: "bg-accent" },
  { code: "STS", name: "Short-term Savings", pct: 12, spent: 200, limit: 1500, color: "bg-white/25" },
  { code: "VAC", name: "Vacation", pct: 90, spent: 4500, limit: 5000, color: "bg-success" },
  { code: "LTS", name: "Long-term (401k)", pct: 20, spent: 800, limit: 4000, color: "bg-white/25" },
  { code: "FED", name: "Passive Invest.", pct: 100, spent: 1200, limit: 1200, color: "bg-primary/60" },
];

const tasks = [
  { text: "Finalize insurance renewal", priority: "High", done: false },
  { text: "Morning workout", priority: "", done: true },
  { text: "Order laundry detergent", priority: "", done: false },
];

const pantryAlerts = [
  { name: "Atlantic Salmon", when: "Expiring Today", urgent: true },
  { name: "Baby Spinach", when: "Expiring 2d", urgent: false },
  { name: "Whole Milk", when: "Expiring 3d", urgent: false },
];

const bills = [
  { name: "Electric", amount: 142.0, due: "Due in 3 days", urgent: true, icon: Zap },
  { name: "Internet", amount: 85.0, due: "Due in 7 days", urgent: false, icon: Wifi },
];

const transactions = [
  { date: "Mar 12", merchant: "Whole Foods Market", cat: "Groceries / ESS", amount: -64.2 },
  { date: "Mar 11", merchant: "Apple Subscription", cat: "Software / FUN", amount: -14.99 },
  { date: "Mar 10", merchant: "Chevron", cat: "Transport / ESS", amount: -52.18 },
  { date: "Mar 09", merchant: "Payroll Deposit", cat: "Income", amount: 3420.0 },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Systems Nominal
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {greeting()}, Aaron.
          </h1>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-2 text-4xl font-light tracking-tight">
            <Sun className="size-8 text-primary" />
            64°<span className="text-muted-foreground">Clear</span>
          </p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      {/* Primary grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Financial Core */}
        <GlassCard className="col-span-12 lg:col-span-8">
          <div className="mb-8 flex items-start justify-between">
            <h2 className="text-2xl font-semibold">Financial Core</h2>
            <div className="text-right">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Net Worth
              </p>
              <p className="font-mono text-3xl font-bold">$442,102.35</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Checking
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight">$12,450</p>
              <p className="mt-1 text-xs text-success">+$820 this week</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Investments
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight">$318,204</p>
              <p className="mt-1 text-xs text-success">+2.4% MTD</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                401(k)
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-tight">$111,447</p>
              <p className="mt-1 text-xs text-muted-foreground">Fidelity</p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/5 pt-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Budget Progress</h3>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              {budgetCategories.map((c) => (
                <div key={c.code}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {c.code} · {c.name}
                    </span>
                    <span className="font-mono text-xs">
                      ${c.spent.toLocaleString()} / ${c.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full ${c.color} transition-all duration-500`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Vacation Countdown */}
        <GlassCard className="col-span-12 flex flex-col items-center justify-center text-center lg:col-span-4">
          <Plane className="mb-3 size-6 text-primary" />
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Next Expedition
          </p>
          <p className="mb-2 text-6xl font-black tracking-tighter">
            12 <span className="text-2xl font-light text-muted-foreground">Days</span>
          </p>
          <p className="text-xl font-medium text-primary">Tokyo, Japan</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">VAC · 90% saved</p>
        </GlassCard>

        {/* Daily Protocols (Tasks) */}
        <GlassCard className="col-span-12 md:col-span-6 lg:col-span-4">
          <h2 className="mb-6 border-b border-white/5 pb-4 text-xl font-semibold">
            Daily Protocols
          </h2>
          <ul className="space-y-4">
            {tasks.map((t, i) => (
              <li key={i} className={`flex items-start gap-4 ${t.done ? "opacity-50" : ""}`}>
                <div
                  className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                    t.done
                      ? "border-white/20 bg-white/20 text-[10px]"
                      : t.priority === "High"
                        ? "border-primary"
                        : "border-white/20"
                  }`}
                >
                  {t.done ? "✓" : null}
                </div>
                <div>
                  <p
                    className={`text-lg leading-tight font-medium ${t.done ? "line-through" : ""}`}
                  >
                    {t.text}
                  </p>
                  {t.priority ? (
                    <p className="text-sm text-muted-foreground">Priority: {t.priority}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Pantry & Recipe */}
        <GlassCard className="col-span-12 flex flex-col md:col-span-6 lg:col-span-5">
          <h2 className="mb-6 text-xl font-semibold">Pantry Intelligence</h2>
          <div className="grid gap-3">
            {pantryAlerts.map((p) => (
              <div
                key={p.name}
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  p.urgent
                    ? "border-warning/30 bg-warning/10"
                    : "border-white/5 bg-white/5"
                }`}
              >
                <div>
                  <p className="text-lg font-medium">{p.name}</p>
                  <p
                    className={`font-mono text-xs uppercase ${
                      p.urgent ? "text-warning" : "text-muted-foreground"
                    }`}
                  >
                    {p.when}
                  </p>
                </div>
                {p.urgent ? <AlertTriangle className="size-5 text-warning" /> : null}
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/5 pt-6">
            <p className="mb-3 flex items-center gap-2 text-sm italic text-muted-foreground">
              <ChefHat className="size-4" />
              Suggested Dinner Tonight
            </p>
            <div className="group flex cursor-pointer items-center gap-4">
              <img
                src={dinnerSalmon}
                alt="Pan-seared salmon"
                width={64}
                height={64}
                loading="lazy"
                className="size-16 rounded-xl object-cover"
              />
              <div>
                <p className="text-lg font-bold transition-colors group-hover:text-primary">
                  Pan-seared Salmon
                </p>
                <p className="text-sm text-muted-foreground">
                  Uses salmon & spinach · 25 min
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Upcoming Bills */}
        <GlassCard className="col-span-12 md:col-span-6 lg:col-span-3">
          <h2 className="mb-6 text-xl font-semibold">Upcoming Bills</h2>
          <div className="space-y-5">
            {bills.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{b.name}</span>
                    </div>
                    <span className="font-mono">${b.amount.toFixed(2)}</span>
                  </div>
                  <p
                    className={`text-right font-mono text-[10px] uppercase ${
                      b.urgent ? "text-warning" : "text-muted-foreground"
                    }`}
                  >
                    {b.due}
                  </p>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="col-span-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View All <ArrowUpRight className="size-4" />
            </button>
          </div>
          <div className="space-y-1">
            {transactions.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-[80px_1fr_1fr_120px] items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/5"
              >
                <span className="font-mono text-xs uppercase text-muted-foreground">
                  {t.date}
                </span>
                <span className="font-medium">{t.merchant}</span>
                <span className="text-sm text-muted-foreground">{t.cat}</span>
                <span
                  className={`text-right font-mono ${
                    t.amount > 0 ? "text-success" : "text-foreground"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
