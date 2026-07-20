import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Pencil, Wallet, TrendingUp, Sparkles, RefreshCw,
  Settings2, Target, LineChart as LineChartIcon,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAccounts, useUpsertAccount, useDeleteAccount,
  useTransactions, useUpsertTransaction, useDeleteTransaction,
  useBudgets, useUpsertBudget, useDeleteBudget,
  useFinanceSettings, useUpsertFinanceSettings, useSeedFinanceDefaults, useApplyFunRollover,
  useBalanceSnapshots, useUpsertBalanceSnapshot, useDeleteBalanceSnapshot,
  accountBalance, budgetSpent,
  type Account, type Transaction, type BudgetCategory, type BalanceSnapshot,
} from "@/lib/atlas-data";
import { PrivacyGuard } from "@/context/PrivacyMode";

export const Route = createFileRoute("/_authenticated/money")({
  head: () => ({ meta: [{ title: "Finances — Atlas" }] }),
  component: FinancesPage,
});

const TXN_TYPES = ["expense", "income", "transfer"] as const;
const ACCOUNT_TYPES = ["checking", "savings", "credit", "investment", "retirement", "cash", "other"] as const;
const KINDS = [
  { value: "spending", label: "Spending" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
] as const;
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmt2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function FinancesPage() {
  return (
    <PrivacyGuard
      sensitivity="private-only"
      fallback={
        <GlassCard className="text-center">
          <h1 className="text-2xl font-semibold">Finances hidden</h1>
          <p className="mt-2 text-muted-foreground">Switch Privacy Mode to Private to view.</p>
        </GlassCard>
      }
    >
      <FinancesDashboard />
    </PrivacyGuard>
  );
}

function FinancesDashboard() {
  const accounts = useAccounts();
  const txns = useTransactions();
  const budgets = useBudgets();
  const settings = useFinanceSettings();
  const snapshots = useBalanceSnapshots();

  const seed = useSeedFinanceDefaults();
  const rollover = useApplyFunRollover();

  const [txnDialog, setTxnDialog] = useState<Partial<Transaction> | null>(null);
  const [budgetDialog, setBudgetDialog] = useState<Partial<BudgetCategory> | null>(null);
  const [snapDialog, setSnapDialog] = useState<Partial<BalanceSnapshot> | null>(null);
  const [accountDialog, setAccountDialog] = useState<Partial<Account> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const allTxns = txns.data ?? [];
  const allAccounts = accounts.data ?? [];
  const allBudgets = budgets.data ?? [];
  const allSnaps = snapshots.data ?? [];

  const netWorth = useMemo(
    () => allAccounts.reduce((s, a) => s + accountBalance(a, allTxns), 0),
    [allAccounts, allTxns],
  );

  const monthStart = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }, []);
  const monthlyIncome = useMemo(
    () => allTxns
      .filter((t) => t.type === "income" && new Date(t.occurred_on) >= monthStart)
      .reduce((s, t) => s + Number(t.amount), 0),
    [allTxns, monthStart],
  );
  const monthlySpent = useMemo(
    () => allTxns
      .filter((t) => t.type === "expense" && new Date(t.occurred_on) >= monthStart)
      .reduce((s, t) => s + Number(t.amount), 0),
    [allTxns, monthStart],
  );

  // Total allocated across spending+savings budgets
  const totalAllocated = allBudgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const availableCash = monthlyIncome - monthlySpent;

  const findAcc = (nameFragment: string) =>
    allAccounts.find((a) => a.name.toLowerCase().includes(nameFragment.toLowerCase()));
  const regions = findAcc("regions") ?? allAccounts.find((a) => a.type === "checking");
  const fidelity = findAcc("fidelity") ?? allAccounts.find((a) => a.type === "investment");
  const lts = findAcc("401") ?? allAccounts.find((a) => a.type === "retirement");

  const empty = allBudgets.length === 0 && allAccounts.length === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Cash allocation · Goals</p>
          <h1 className="text-4xl font-bold tracking-tight">Finances</h1>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Net Worth</p>
            <p className="font-mono text-3xl font-bold">{fmt(netWorth)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="mr-1 size-4" /> Settings
          </Button>
        </div>
      </header>

      {empty && (
        <GlassCard className="text-center">
          <Sparkles className="mx-auto size-10 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">Set up your budget</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create the six default categories (Essentials, Fun, Short-Term Savings, Vacation Fund, Long-Term Savings, Fidelity Investments) in one click.
          </p>
          <Button className="mt-4" onClick={() => seed.mutate()} disabled={seed.isPending}>
            Seed default categories
          </Button>
        </GlassCard>
      )}

      {/* Top-level balances */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Regions Checking" value={regions ? fmt(accountBalance(regions, allTxns)) : "—"} hint={regions?.institution ?? "Add checking account"} onClick={() => setAccountDialog(regions ?? { type: "checking", name: "Regions Checking", institution: "Regions" })} />
        <StatTile label="Fidelity Investments (FED)" value={fidelity ? fmt(accountBalance(fidelity, allTxns)) : "—"} hint={fidelity?.institution ?? "Add brokerage account"} onClick={() => setAccountDialog(fidelity ?? { type: "investment", name: "Fidelity Investments", institution: "Fidelity" })} />
        <StatTile label="Long-Term Savings (LTS · 401(k))" value={lts ? fmt(accountBalance(lts, allTxns)) : "—"} hint={lts?.institution ?? "Add 401(k) account"} onClick={() => setAccountDialog(lts ?? { type: "retirement", name: "401(k)" })} />
        <StatTile label="Available Cash This Month" value={fmt(availableCash)} hint={`Income ${fmt(monthlyIncome)} · Spent ${fmt(monthlySpent)}`} accent />
      </div>

      {/* Monthly summary */}
      <GlassCard>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">This month</h2>
            <p className="text-sm text-muted-foreground">Allocated {fmt(totalAllocated)} · Spent {fmt(monthlySpent)} · Income {fmt(monthlyIncome)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (confirm("Close previous month and apply Fun-money rollover?")) rollover.mutate(); }}
              disabled={rollover.isPending}
            >
              <RefreshCw className="mr-1 size-4" /> Close prior month
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setBudgetDialog({ kind: "spending", rollover: true })}>
              <Plus className="mr-1 size-4" /> Category
            </Button>
          </div>
        </div>

        {allBudgets.length === 0 ? (
          <EmptyState text="No budget categories yet." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {allBudgets.map((c) => (
              <BudgetRow key={c.id} cat={c} txns={allTxns} onEdit={() => setBudgetDialog(c)} />
            ))}
          </div>
        )}
      </GlassCard>

      {/* Investment growth */}
      <InvestmentGrowth
        budgets={allBudgets}
        snapshots={allSnaps}
        accounts={allAccounts}
        onAdd={(preset) => setSnapDialog(preset)}
        onDelete={(id) => setSnapDialog({ id } as any)}
      />

      {/* Transactions */}
      <GlassCard>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <Button
            size="sm"
            onClick={() => setTxnDialog({ type: "expense", occurred_on: new Date().toISOString().slice(0, 10) })}
            disabled={!allAccounts.length}
          >
            <Plus className="mr-1 size-4" /> Transaction
          </Button>
        </div>
        {allTxns.length === 0 ? (
          <EmptyState text="Log a transaction to start tracking against budgets." />
        ) : (
          <div className="space-y-1">
            {allTxns.slice(0, 25).map((t) => {
              const acc = allAccounts.find((a) => a.id === t.account_id);
              const cat = allBudgets.find((b) => b.id === t.category_id);
              return (
                <div key={t.id} className="group grid grid-cols-[88px_1fr_1fr_120px_32px] items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/5">
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {new Date(t.occurred_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <button className="text-left font-medium hover:underline" onClick={() => setTxnDialog(t)}>
                    {t.merchant}
                  </button>
                  <span className="truncate text-sm text-muted-foreground">
                    {cat ? `${cat.name} (${cat.code})` : "Uncategorized"} · {acc?.name ?? "—"}
                  </span>
                  <span className={`text-right font-mono text-sm ${t.type === "income" ? "text-success" : ""}`}>
                    {t.type === "income" ? "+" : "-"}{fmt2(Math.abs(Number(t.amount)))}
                  </span>
                  <TrashButton id={t.id} deleter={useDeleteTransaction} />
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Supporting accounts */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Supporting accounts</h2>
            <p className="text-sm text-muted-foreground">Accounts feed the budget — not the other way around.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAccountDialog({ type: "checking" })}>
            <Plus className="mr-1 size-4" /> Account
          </Button>
        </div>
        {allAccounts.length === 0 ? (
          <EmptyState icon={Wallet} text="No accounts yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {allAccounts.map((a) => (
              <button key={a.id} onClick={() => setAccountDialog(a)} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-left hover:bg-white/10">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{a.type} · {a.institution ?? "—"}</p>
                <p className="mt-1 text-base font-semibold">{a.name}</p>
                <p className="mt-2 font-mono text-lg">{fmt(accountBalance(a, allTxns))}</p>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      <TxnDialog open={txnDialog !== null} initial={txnDialog} accounts={allAccounts} categories={allBudgets} onClose={() => setTxnDialog(null)} />
      <BudgetDialog open={budgetDialog !== null} initial={budgetDialog} onClose={() => setBudgetDialog(null)} />
      <SnapshotDialog open={snapDialog !== null} initial={snapDialog} budgets={allBudgets} accounts={allAccounts} onClose={() => setSnapDialog(null)} />
      <AccountDialog open={accountDialog !== null} initial={accountDialog} onClose={() => setAccountDialog(null)} />
      <SettingsDialog open={settingsOpen} settings={settings.data ?? null} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

// ---------- Building blocks ----------
function StatTile({ label, value, hint, accent, onClick }: { label: string; value: string; hint?: string; accent?: boolean; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 text-left transition-all ${onClick ? "hover:bg-white/5" : ""} ${accent ? "border border-primary/40" : ""}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </Comp>
  );
}

function BudgetRow({ cat, txns, onEdit }: { cat: BudgetCategory; txns: Transaction[]; onEdit: () => void }) {
  const spent = budgetSpent(cat, txns);
  const limit = Number(cat.monthly_limit);
  const roll = Number(cat.rollover_balance);
  const available = limit + roll;
  const pct = available > 0 ? Math.min(100, (spent / available) * 100) : 0;
  const remaining = available - spent;
  const isSaving = cat.kind !== "spending";
  const goal = cat.goal_amount ? Number(cat.goal_amount) : null;
  const goalPct = goal && goal > 0 ? Math.min(100, (roll / goal) * 100) : null;
  const bar = pct >= 100 ? "bg-warning" : isSaving ? "bg-accent" : "bg-primary";

  return (
    <button onClick={onEdit} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:bg-white/10">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <p className="text-base font-semibold">{cat.name} <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground">{cat.code}</span></p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {cat.kind}{cat.rollover ? " · rolls over" : ""}
          </p>
        </div>
        <p className="font-mono text-sm">
          {isSaving ? `${fmt(spent)} contributed` : `${fmt(spent)} / ${fmt(available)}`}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div className={`h-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>Budgeted {fmt(limit)}{roll ? ` · carryover ${fmt(roll)}` : ""}</span>
        <span className={remaining < 0 ? "text-warning" : ""}>Remaining {fmt(remaining)}</span>
      </div>
      {goalPct != null && (
        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Target className="size-3" /> Goal {fmt(goal!)}</span>
            <span>{goalPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-success" style={{ width: `${goalPct}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}

function InvestmentGrowth({ budgets, snapshots, accounts, onAdd }: {
  budgets: BudgetCategory[]; snapshots: BalanceSnapshot[]; accounts: Account[];
  onAdd: (preset: Partial<BalanceSnapshot>) => void; onDelete: (id: string) => void;
}) {
  const del = useDeleteBalanceSnapshot();
  const targets = budgets.filter((b) => b.kind === "investment" || b.kind === "savings");
  const byDate = new Map<string, any>();
  snapshots.forEach((s) => {
    const key = s.on_date;
    if (!byDate.has(key)) byDate.set(key, { date: key });
    const row = byDate.get(key);
    const label = s.label ?? budgets.find((b) => b.id === s.category_id)?.code ?? accounts.find((a) => a.id === s.account_id)?.name ?? "Other";
    row[label] = Number(s.balance);
  });
  const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const series = Array.from(new Set(snapshots.map((s) => s.label ?? budgets.find((b) => b.id === s.category_id)?.code ?? accounts.find((a) => a.id === s.account_id)?.name ?? "Other")));
  const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))"];

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold"><LineChartIcon className="size-5" /> Investment & savings growth</h2>
          <p className="text-sm text-muted-foreground">Record balances over time to see the trend.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {targets.map((t) => (
            <Button key={t.id} size="sm" variant="outline" onClick={() => onAdd({ category_id: t.id, label: t.code, on_date: new Date().toISOString().slice(0, 10) })}>
              <Plus className="mr-1 size-4" /> {t.code} balance
            </Button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <EmptyState text="Add a balance snapshot (LTS, FED, etc.) to plot growth." />
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: any) => fmt(Number(v))} />
                <Legend />
                {series.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-1 text-xs">
            {snapshots.slice(-10).reverse().map((s) => {
              const cat = budgets.find((b) => b.id === s.category_id);
              return (
                <div key={s.id} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
                  <span className="font-mono text-muted-foreground">{s.on_date}</span>
                  <span>{s.label ?? cat?.code ?? "—"}</span>
                  <span className="font-mono">{fmt(Number(s.balance))}</span>
                  <button className="opacity-0 group-hover:opacity-100" onClick={() => { if (confirm("Delete snapshot?")) del.mutate(s.id); }}>
                    <Trash2 className="size-3 text-muted-foreground hover:text-warning" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </GlassCard>
  );
}

function EmptyState({ icon: Icon, text }: { icon?: typeof Wallet; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-sm text-muted-foreground">
      {Icon ? <Icon className="size-8 opacity-40" /> : null}
      <p>{text}</p>
    </div>
  );
}

function TrashButton({ id, deleter }: { id: string; deleter: () => { mutate: (id: string) => void } }) {
  const del = deleter();
  return (
    <button
      className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-warning group-hover:opacity-100"
      onClick={() => { if (confirm("Delete?")) del.mutate(id); }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

// ---------- Dialogs ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function BudgetDialog({ open, initial, onClose }: { open: boolean; initial: Partial<BudgetCategory> | null; onClose: () => void }) {
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();
  const [form, setForm] = useState<Partial<BudgetCategory>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code"><Input maxLength={4} value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
            <div className="col-span-2"><Field label="Full name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          </div>
          <Field label="Kind">
            <Select value={form.kind ?? "spending"} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly amount">
              <Input type="number" step="0.01" value={form.monthly_limit ?? 0} onChange={(e) => setForm({ ...form, monthly_limit: Number(e.target.value) })} />
            </Field>
            <Field label="Goal (optional)">
              <Input type="number" step="0.01" value={form.goal_amount ?? ""} onChange={(e) => setForm({ ...form, goal_amount: e.target.value ? Number(e.target.value) : null })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.rollover} onChange={(e) => setForm({ ...form, rollover: e.target.checked })} />
            Roll leftover into next month
          </label>
          {initial?.id && (
            <Field label="Carryover balance">
              <Input type="number" step="0.01" value={form.rollover_balance ?? 0} onChange={(e) => setForm({ ...form, rollover_balance: Number(e.target.value) })} />
            </Field>
          )}
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete category?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => { if (!form.code || !form.name) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TxnDialog({ open, initial, accounts, categories, onClose }: { open: boolean; initial: Partial<Transaction> | null; accounts: Account[]; categories: BudgetCategory[]; onClose: () => void }) {
  const upsert = useUpsertTransaction();
  const del = useDeleteTransaction();
  const [form, setForm] = useState<Partial<Transaction>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit transaction" : "New transaction"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Merchant / description"><Input value={form.merchant ?? ""} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input type="number" step="0.01" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Type">
              <Select value={form.type ?? "expense"} onValueChange={(v) => setForm({ ...form, type: v as Transaction["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TXN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Account">
            <Select value={form.account_id ?? ""} onValueChange={(v) => setForm({ ...form, account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={form.category_id ?? "__none"} onValueChange={(v) => setForm({ ...form, category_id: v === "__none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Uncategorized</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => { if (!form.merchant || !form.account_id || !form.amount) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnapshotDialog({ open, initial, budgets, accounts, onClose }: { open: boolean; initial: Partial<BalanceSnapshot> | null; budgets: BudgetCategory[]; accounts: Account[]; onClose: () => void }) {
  const upsert = useUpsertBalanceSnapshot();
  const [form, setForm] = useState<Partial<BalanceSnapshot>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>Record balance</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category_id ?? "__none"} onValueChange={(v) => setForm({ ...form, category_id: v === "__none" ? null : v, label: budgets.find((b) => b.id === v)?.code ?? form.label })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {budgets.filter((b) => b.kind !== "spending").map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Account (optional)">
              <Select value={form.account_id ?? "__none"} onValueChange={(v) => setForm({ ...form, account_id: v === "__none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label">
              <Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.on_date ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, on_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Balance">
            <Input type="number" step="0.01" value={form.balance ?? ""} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={async () => { if (!form.balance) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({ open, initial, onClose }: { open: boolean; initial: Partial<Account> | null; onClose: () => void }) {
  const upsert = useUpsertAccount();
  const del = useDeleteAccount();
  const [form, setForm] = useState<Partial<Account>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit account" : "New account"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type ?? "checking"} onValueChange={(v) => setForm({ ...form, type: v as Account["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Institution"><Input value={form.institution ?? ""} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field>
          </div>
          <Field label="Starting balance">
            <Input type="number" step="0.01" value={form.starting_balance ?? 0} onChange={(e) => setForm({ ...form, starting_balance: Number(e.target.value) })} />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete account?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => { if (!form.name) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ open, settings, onClose }: { open: boolean; settings: ReturnType<typeof useFinanceSettings>["data"]; onClose: () => void }) {
  const upsert = useUpsertFinanceSettings();
  const [form, setForm] = useState({ vac: 70, sts: 25, fun: 5 });
  useEffect(() => {
    if (settings) setForm({
      vac: Number(settings.fun_to_vacation_pct),
      sts: Number(settings.fun_to_sts_pct),
      fun: Number(settings.fun_to_fun_pct),
    });
  }, [settings, open]);
  const total = form.vac + form.sts + form.fun;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>Fun-money rollover split</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          At month close, leftover Fun money is split into these buckets. Total should equal 100%.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Vacation %"><Input type="number" value={form.vac} onChange={(e) => setForm({ ...form, vac: Number(e.target.value) })} /></Field>
          <Field label="Short-Term %"><Input type="number" value={form.sts} onChange={(e) => setForm({ ...form, sts: Number(e.target.value) })} /></Field>
          <Field label="Fun %"><Input type="number" value={form.fun} onChange={(e) => setForm({ ...form, fun: Number(e.target.value) })} /></Field>
        </div>
        <p className={`text-xs ${total === 100 ? "text-muted-foreground" : "text-warning"}`}>Total: {total}%</p>
        <DialogFooter>
          <Button
            onClick={async () => {
              await upsert.mutateAsync({
                fun_to_vacation_pct: form.vac,
                fun_to_sts_pct: form.sts,
                fun_to_fun_pct: form.fun,
              });
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
