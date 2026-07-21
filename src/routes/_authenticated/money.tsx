import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Trash2, Wallet, Sparkles, RefreshCw,
  Settings2, Target, LineChart as LineChartIcon, Upload, FileSpreadsheet, Pencil,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAccounts, useUpsertAccount, useDeleteAccount,
  useTransactions, useUpsertTransaction, useDeleteTransaction,
  useBudgets, useUpsertBudget, useDeleteBudget,
  useFinanceSettings, useUpsertFinanceSettings, useSeedFinanceDefaults,
  useCloseMonthPlan, useCloseMonth, type CloseMonthPlan,
  useBalanceSnapshots, useUpsertBalanceSnapshot,
  useMonthlySummaries, useUpsertMonthlySummary, useDeleteMonthlySummary, useBulkImportMonthlySummaries,
  accountBalance, budgetSpent,
  DEFAULT_RULES, type FinanceRules,
  type Account, type Transaction, type BudgetCategory, type BalanceSnapshot, type MonthlySummary,
} from "@/lib/atlas-data";
import { PrivacyGuard } from "@/context/PrivacyMode";

export const Route = createFileRoute("/_authenticated/money")({
  head: () => ({ meta: [{ title: "Finances — Atlas" }] }),
  component: FinancesPage,
});

// --- Constants -----------------------------------------------------------
const TXN_TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "savings_contribution", label: "Savings contribution" },
  { value: "investment_contribution", label: "Investment contribution" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
] as const;
const ACCOUNT_TYPES = ["checking", "savings", "credit", "investment", "retirement", "cash", "other"] as const;
const KINDS = [
  { value: "spending", label: "Spending" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
] as const;

// Fully spelled-out labels; acronym shown secondarily.
const CATEGORY_LABELS: Record<string, { long: string; short: string }> = {
  HOU: { long: "Housing & Utilities", short: "HOU" },
  ESS: { long: "Essentials", short: "ESS" },
  FUN: { long: "Fun", short: "FUN" },
  STS: { long: "Short-Term Savings", short: "STS" },
  VAC: { long: "Vacation Fund", short: "VAC" },
  LTS: { long: "Long-Term Savings (401(k))", short: "LTS" },
  FED: { long: "Fidelity Investments", short: "FED" },
  RSU: { long: "Restricted Stock Units", short: "RSU" },
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmt2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

// Higher-contrast chart tokens (used inline so the values are literal for Recharts).
const CHART = {
  axis: "rgba(226, 232, 240, 0.75)",
  grid: "rgba(255, 255, 255, 0.12)",
  tooltipBg: "rgba(15, 20, 34, 0.95)",
  tooltipBorder: "rgba(255, 255, 255, 0.18)",
};
// Accent color per category. Kept muted enough to sit on the dark glass panels.
// (FED/STS colors swapped per user request; RSU added.)
const SERIES_COLOR: Record<string, string> = {
  HOU: "#f59e0b",
  ESS: "#38bdf8",
  FUN: "#a78bfa",
  STS: "#22d3ee",  // was FED cyan
  VAC: "#f472b6",
  LTS: "#fbbf24",
  FED: "#34d399",  // was STS green
  RSU: "#c084fc",
  Regions: "#94a3b8",
};

// --- Page ----------------------------------------------------------------
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
  const summaries = useMonthlySummaries();
  const seed = useSeedFinanceDefaults();

  const [txnDialog, setTxnDialog] = useState<Partial<Transaction> | null>(null);
  const [budgetDialog, setBudgetDialog] = useState<Partial<BudgetCategory> | null>(null);
  const [accountDialog, setAccountDialog] = useState<Partial<Account> | null>(null);
  const [monthDialog, setMonthDialog] = useState<Partial<MonthlySummary> | null>(null);
  const [monthReport, setMonthReport] = useState<MonthlySummary | null>(null);
  const [closeMonthOpen, setCloseMonthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const allTxns = txns.data ?? [];
  const allAccounts = accounts.data ?? [];
  const allBudgets = budgets.data ?? [];
  const allSummaries = summaries.data ?? [];

  const rules: FinanceRules = { ...DEFAULT_RULES, ...((settings.data?.rules ?? {}) as Partial<FinanceRules>) };

  const netWorth = useMemo(
    () => allAccounts.reduce((s, a) => s + accountBalance(a, allTxns), 0),
    [allAccounts, allTxns],
  );

  // Current + previous month markers.
  const now = new Date();
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), []);
  const nextMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 1), []);
  const prevMonthKey = useMemo(() => monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), []);
  const curMonthKey = monthKey(monthStart);

  const monthlyIncome = useMemo(
    () => allTxns
      .filter((t) => t.type === "income" && new Date(t.occurred_on) >= monthStart && new Date(t.occurred_on) < nextMonthStart)
      .reduce((s, t) => s + Number(t.amount), 0),
    [allTxns, monthStart, nextMonthStart],
  );
  const monthlySpent = useMemo(
    () => allTxns
      .filter((t) => t.type === "expense" && new Date(t.occurred_on) >= monthStart && new Date(t.occurred_on) < nextMonthStart)
      .reduce((s, t) => s + Number(t.amount), 0),
    [allTxns, monthStart, nextMonthStart],
  );

  // Prior-month summary drives this month's budget per workbook rule:
  //    budget = prior month income − prior month housing.
  const priorSummary = allSummaries.find((s) => s.month === prevMonthKey);
  const currentSummary = allSummaries.find((s) => s.month === curMonthKey);
  const monthlyBudget = currentSummary
    ? Number(currentSummary.budget)
    : priorSummary
      ? Math.max(0, Number(priorSummary.income) - Number(priorSummary.housing))
      : 0;

  const totalAllocated = allBudgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const unallocated = monthlyBudget - totalAllocated;

  const findAcc = (nameFragment: string) =>
    allAccounts.find((a) => a.name.toLowerCase().includes(nameFragment.toLowerCase()));
  const regions = findAcc("regions") ?? allAccounts.find((a) => a.type === "checking");
  const fidelity = findAcc("fidelity") ?? allAccounts.find((a) => a.type === "investment");
  const lts = findAcc("401") ?? allAccounts.find((a) => a.type === "retirement");
  const rsu = findAcc("rsu") ?? findAcc("stock");

  // Balances: prefer live account balances, fall back to latest monthly summary from Excel.
  const latestSummary = allSummaries.at(-1);
  const regionsBal = regions ? accountBalance(regions, allTxns) : Number(latestSummary?.regions_balance ?? 0);
  const fedBal = fidelity ? accountBalance(fidelity, allTxns) : Number(latestSummary?.fed_balance ?? 0);
  const ltsBal = lts ? accountBalance(lts, allTxns) : Number(latestSummary?.lts_balance ?? 0);
  const rsuBal = rsu ? accountBalance(rsu, allTxns) : Number((latestSummary as any)?.rsu_balance ?? 0);

  const empty = allBudgets.length === 0 && allAccounts.length === 0 && allSummaries.length === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Cash allocation · Goals · History</p>
          <h1 className="text-4xl font-bold tracking-tight">Finances</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Net Worth</p>
            <p className="font-mono text-3xl font-bold">{fmt(netWorth || (regionsBal + fedBal + ltsBal + rsuBal))}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 size-4" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="mr-1 size-4" /> Financial Rules
          </Button>
        </div>
      </header>

      {empty && (
        <GlassCard className="text-center">
          <Sparkles className="mx-auto size-10 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">Set up your budget</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create the eight default categories (Housing &amp; Utilities, Essentials, Fun, Short-Term Savings, Vacation Fund, Long-Term Savings, Fidelity Investments, Restricted Stock Units) in one click.
          </p>
          <Button className="mt-4" onClick={() => seed.mutate()} disabled={seed.isPending}>
            Seed default categories
          </Button>
        </GlassCard>
      )}

      {/* Top tiles: 4 supporting balances + Monthly Budget summary */}
      <div className="grid gap-4 lg:grid-cols-5">
        <StatTile
          label="Regions Checking"
          value={fmt(regionsBal)}
          hint={regions?.institution ?? "Add checking account"}
          onClick={() => setAccountDialog(regions ?? { type: "checking", name: "Regions Checking", institution: "Regions" })}
        />
        <StatTile
          label="Fidelity Investments"
          sub="FED"
          value={fmt(fedBal)}
          hint={fidelity?.institution ?? "Brokerage balance"}
          onClick={() => setAccountDialog(fidelity ?? { type: "investment", name: "Fidelity Investments", institution: "Fidelity" })}
          accent={SERIES_COLOR.FED}
        />
        <StatTile
          label="Long-Term Savings"
          sub="LTS · 401(k)"
          value={fmt(ltsBal)}
          hint={lts?.institution ?? "Retirement account"}
          onClick={() => setAccountDialog(lts ?? { type: "retirement", name: "401(k)" })}
          accent={SERIES_COLOR.LTS}
        />
        <StatTile
          label="Restricted Stock Units"
          sub="RSU"
          value={fmt(rsuBal)}
          hint={rsu?.institution ?? "Employer equity"}
          onClick={() => setAccountDialog(rsu ?? { type: "investment", name: "Restricted Stock Units", institution: "Employer" })}
          accent={SERIES_COLOR.RSU}
        />
        <MonthlyBudgetCard
          budget={monthlyBudget}
          allocated={totalAllocated}
          spent={monthlySpent}
          nextMonthIncome={monthlyIncome}
        />
      </div>


      {/* Categories */}
      <GlassCard>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">This month</h2>
            <p className="text-sm text-muted-foreground">
              Budget {fmt(monthlyBudget)} · Allocated {fmt(totalAllocated)} · Spent {fmt(monthlySpent)} · Unallocated {fmt(unallocated)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCloseMonthOpen(true)}>
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

      {/* Growth chart with mode selector */}
      <GrowthChart summaries={allSummaries} snapshots={snapshots.data ?? []} />

      {/* Recent activity */}
      <GlassCard>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <Button
            size="sm"
            onClick={() => setTxnDialog({ type: "expense", occurred_on: new Date().toISOString().slice(0, 10) })}
          >
            <Plus className="mr-1 size-4" /> Add transaction
          </Button>
        </div>
        {allTxns.length === 0 ? (
          <EmptyState text="Log a transaction to start tracking against budgets." />
        ) : (
          <div className="space-y-1">
            {allTxns.slice(0, 30).map((t) => {
              const acc = allAccounts.find((a) => a.id === t.account_id);
              const cat = allBudgets.find((b) => b.id === t.category_id);
              const isCredit = t.type === "income" || t.type === "adjustment";
              return (
                <TxnRow
                  key={t.id}
                  txn={t}
                  account={acc}
                  category={cat}
                  isCredit={isCredit}
                  onEdit={() => setTxnDialog(t)}
                />
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Monthly history */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Monthly history</h2>
            <p className="text-sm text-muted-foreground">Each row mirrors one month from your workbook. Click to edit.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setMonthDialog({ month: curMonthKey })}>
            <Plus className="mr-1 size-4" /> Month
          </Button>
        </div>
        {allSummaries.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} text="No monthly history yet. Use Import to load your workbook." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="p-2">Month</th>
                  <th className="p-2 text-right">Income</th>
                  <th className="p-2 text-right">Housing</th>
                  <th className="p-2 text-right">Budget</th>
                  <th className="p-2 text-right">ESS spent</th>
                  <th className="p-2 text-right">FUN spent</th>
                  <th className="p-2 text-right">STS balance</th>
                  <th className="p-2 text-right">VAC balance</th>
                  <th className="p-2 text-right">LTS balance</th>
                  <th className="p-2 text-right">FED balance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {allSummaries.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                    onClick={() => setMonthReport(s)}
                  >
                    <td className="p-2 font-mono">{monthLabel(s.month)}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.income))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.housing))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.budget))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.ess_spent))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.fun_spent))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.sts_balance))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.vac_balance))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.lts_balance))}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(s.fed_balance))}</td>
                    <td className="p-2 text-right">
                      <button
                        className="text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setMonthDialog(s); }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Supporting accounts */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Supporting accounts</h2>
            <p className="text-sm text-muted-foreground">Accounts feed the budget — they aren't the primary view.</p>
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
      <AccountDialog open={accountDialog !== null} initial={accountDialog} onClose={() => setAccountDialog(null)} />
      <MonthDialog open={monthDialog !== null} initial={monthDialog} onClose={() => setMonthDialog(null)} />
      <MonthReportDialog
        summary={monthReport}
        onClose={() => setMonthReport(null)}
        onEdit={(s) => { setMonthReport(null); setMonthDialog(s); }}
      />
      <CloseMonthDialog open={closeMonthOpen} onClose={() => setCloseMonthOpen(false)} />
      <SettingsDialog open={settingsOpen} settingsRow={settings.data ?? null} onClose={() => setSettingsOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

// --- Building blocks ------------------------------------------------------
function StatTile({ label, sub, value, hint, onClick, accent }: { label: string; sub?: string; value: string; hint?: string; onClick?: () => void; accent?: string }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`glass-panel relative overflow-hidden rounded-2xl p-5 text-left transition-all ${onClick ? "hover:bg-white/5" : ""}`}
      style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}{sub && <span className="ml-1 opacity-70">· {sub}</span>}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold" style={accent ? { color: accent } : undefined}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </Comp>
  );
}

function MonthlyBudgetCard({ budget, allocated, spent, nextMonthIncome }: { budget: number; allocated: number; spent: number; nextMonthIncome: number }) {
  const available = budget - allocated;
  const remaining = budget - spent;
  return (
    <div className="glass-panel rounded-2xl border border-primary/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Current Budget</p>
      <p className="mt-2 font-mono text-2xl font-bold">{fmt(budget)}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className={available < 0 ? "text-warning" : "text-muted-foreground"}>Budget Available</span>
        <span className={`text-right font-mono ${available < 0 ? "text-warning" : ""}`}>{fmt(available)}</span>
        <span className="text-muted-foreground">Amount Spent</span>
        <span className="text-right font-mono">{fmt(spent)}</span>
        <span className={remaining < 0 ? "text-warning" : "text-muted-foreground"}>Remaining Budget</span>
        <span className={`text-right font-mono ${remaining < 0 ? "text-warning" : ""}`}>{fmt(remaining)}</span>
      </div>
      <div className="mt-3 border-t border-white/10 pt-2 text-xs">
        <div className="grid grid-cols-2 gap-x-3">
          <span className="text-muted-foreground">Next Month Income</span>
          <span className="text-right font-mono text-primary">{fmt(nextMonthIncome)}</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Income this month becomes next month's budget after closing.
        </p>
      </div>
    </div>
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
  const label = CATEGORY_LABELS[cat.code] ?? { long: cat.name, short: cat.code };
  const accent = (cat.color && cat.color.startsWith("#")) ? cat.color : (SERIES_COLOR[cat.code] ?? "hsl(var(--primary))");
  const overspent = pct >= 100 && !isSaving;

  return (
    <button
      onClick={onEdit}
      className="rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:bg-white/10"
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <p className="text-base font-semibold" style={{ color: accent }}>
            {label.long} <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground">{label.short}</span>
          </p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {cat.kind}{cat.rollover ? " · rolls over" : ""}
          </p>
        </div>
        <p className="font-mono text-sm">
          {isSaving ? `${fmt(spent)} contributed` : `${fmt(spent)} / ${fmt(available)}`}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: overspent ? "hsl(var(--warning))" : accent }}
        />
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

function TxnRow({ txn, account, category, isCredit, onEdit }: { txn: Transaction; account?: Account; category?: BudgetCategory; isCredit: boolean; onEdit: () => void }) {
  const del = useDeleteTransaction();
  const catLabel = category ? (CATEGORY_LABELS[category.code]?.long ?? category.name) : "Uncategorized";
  return (
    <div className="group grid grid-cols-[80px_1fr_1fr_110px_120px_32px] items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5">
      <span className="font-mono text-xs uppercase text-muted-foreground">
        {new Date(txn.occurred_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
      <button className="text-left font-medium hover:underline" onClick={onEdit}>{txn.merchant}</button>
      <span className="truncate text-xs text-muted-foreground">{catLabel} · {account?.name ?? "No account"}</span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {TXN_TYPES.find((t) => t.value === txn.type)?.label ?? txn.type}
      </span>
      <span className={`text-right font-mono text-sm ${isCredit ? "text-success" : ""}`}>
        {isCredit ? "+" : "-"}{fmt2(Math.abs(Number(txn.amount)))}
      </span>
      <button
        className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-warning group-hover:opacity-100"
        onClick={() => { if (confirm("Delete transaction?")) del.mutate(txn.id); }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// --- Growth chart ---------------------------------------------------------
type ChartMode = "balances" | "monthly";

function GrowthChart({ summaries, snapshots }: { summaries: MonthlySummary[]; snapshots: BalanceSnapshot[] }) {
  const [mode, setMode] = useState<ChartMode>("balances");

  // BALANCES: cumulative Fidelity / Long-Term Savings / Vacation / Short-Term Savings / Regions.
  const balanceRows = useMemo(() => summaries.map((s) => ({
    date: monthLabel(s.month),
    FED: Number(s.fed_balance),
    LTS: Number(s.lts_balance),
    VAC: Number(s.vac_balance),
    STS: Number(s.sts_balance),
    Regions: Number(s.regions_balance),
  })), [summaries]);
  const balanceSeries: (keyof typeof balanceRows[number])[] = ["FED", "LTS", "VAC", "STS", "Regions"];

  // MONTHLY activity: allocated & spent per category, month by month.
  const monthlyRows = useMemo(() => summaries.map((s) => ({
    date: monthLabel(s.month),
    Housing: Number(s.housing),
    "ESS spent": Number(s.ess_spent),
    "FUN spent": Number(s.fun_spent),
    "STS contrib": Number(s.sts_spent),
    "LTS contrib": Number(s.lts_contribution),
  })), [summaries]);
  const monthlySeries = ["Housing", "ESS spent", "FUN spent", "STS contrib", "LTS contrib"];
  const monthlyColors: Record<string, string> = {
    Housing: SERIES_COLOR.HOU, "ESS spent": SERIES_COLOR.ESS, "FUN spent": SERIES_COLOR.FUN,
    "STS contrib": SERIES_COLOR.STS, "LTS contrib": SERIES_COLOR.LTS,
  };

  const isEmpty = summaries.length === 0 && snapshots.length === 0;

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <LineChartIcon className="size-5" /> Investment &amp; Savings Growth
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "balances" ? "Cumulative account balances over time." : "Monthly spending & contribution activity."}
          </p>
        </div>
        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${mode === "balances" ? "bg-white/15 text-foreground" : "text-muted-foreground"}`}
            onClick={() => setMode("balances")}
          >
            Balances
          </button>
          <button
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ${mode === "monthly" ? "bg-white/15 text-foreground" : "text-muted-foreground"}`}
            onClick={() => setMode("monthly")}
          >
            Monthly activity
          </button>
        </div>
      </div>
      {isEmpty ? (
        <EmptyState text="Import your workbook or add a monthly row to plot the trend." />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            {mode === "balances" ? (
              <LineChart data={balanceRows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" />
                <XAxis dataKey="date" stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} />
                <YAxis stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 12, color: "#f8fafc" }}
                  formatter={(v: any, k: any) => [fmt(Number(v)), k]}
                />
                <Legend wrapperStyle={{ color: CHART.axis, fontSize: 12 }} />
                {balanceSeries.map((k) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={SERIES_COLOR[k as string]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            ) : (
              <BarChart data={monthlyRows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" />
                <XAxis dataKey="date" stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} />
                <YAxis stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 12, color: "#f8fafc" }}
                  formatter={(v: any, k: any) => [fmt(Number(v)), k]}
                />
                <Legend wrapperStyle={{ color: CHART.axis, fontSize: 12 }} />
                {monthlySeries.map((k) => (
                  <Bar key={k} dataKey={k} fill={monthlyColors[k]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
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

// --- Dialogs --------------------------------------------------------------
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
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Description">
                <Input value={form.merchant ?? ""} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
              </Field>
            </div>
            <Field label="Date">
              <Input type="date" value={form.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input type="number" step="0.01" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Type">
              <Select value={form.type ?? "expense"} onValueChange={(v) => setForm({ ...form, type: v as Transaction["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TXN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Category">
            <Select value={form.category_id ?? "__none"} onValueChange={(v) => setForm({ ...form, category_id: v === "__none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Uncategorized</SelectItem>
                {categories.map((c) => {
                  const l = CATEGORY_LABELS[c.code] ?? { long: c.name, short: c.code };
                  return <SelectItem key={c.id} value={c.id}>{l.long} ({l.short})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Account (optional)">
            <Select value={form.account_id ?? "__none"} onValueChange={(v) => setForm({ ...form, account_id: v === "__none" ? null : v as any })}>
              <SelectTrigger><SelectValue placeholder="No account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No account</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value || null })} rows={2} />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => {
            if (!form.merchant || form.amount == null) return;
            await upsert.mutateAsync({
              ...form,
              amount: Math.abs(Number(form.amount)),
              type: form.type ?? "expense",
              account_id: (form.account_id as any) || null,
              occurred_on: form.occurred_on ?? new Date().toISOString().slice(0, 10),
            } as any);
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccountDialog({ open, initial, onClose }: { open: boolean; initial: Partial<Account> | null; onClose: () => void }) {
  const upsert = useUpsertAccount();
  const del = useDeleteAccount();
  const snap = useUpsertBalanceSnapshot();
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
          <Field label="Current balance">
            <Input type="number" step="0.01" value={form.starting_balance ?? 0} onChange={(e) => setForm({ ...form, starting_balance: Number(e.target.value) })} />
          </Field>
          {initial?.id && (
            <p className="text-xs text-muted-foreground">
              Tip: recording a new balance also creates a snapshot for the growth chart.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete account?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => {
            if (!form.name) return;
            const saved = await upsert.mutateAsync(form as any);
            if (initial?.id && form.starting_balance != null) {
              snap.mutate({ account_id: saved.id, label: saved.name, balance: Number(form.starting_balance), on_date: new Date().toISOString().slice(0, 10) });
            }
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit / add a single month row (mirrors an Excel row).
function MonthDialog({ open, initial, onClose }: { open: boolean; initial: Partial<MonthlySummary> | null; onClose: () => void }) {
  const upsert = useUpsertMonthlySummary();
  const del = useDeleteMonthlySummary();
  const [form, setForm] = useState<Partial<MonthlySummary>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  const num = (k: keyof MonthlySummary) => (
    <Input type="number" step="0.01" value={(form as any)[k] ?? 0}
      onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) } as any)} />
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? `Month · ${initial?.month}` : "New month"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Month (YYYY-MM-01)"><Input value={form.month ?? ""} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>
          <Field label="Income">{num("income")}</Field>
          <Field label="Housing & Utilities">{num("housing")}</Field>
          <Field label="Budget">{num("budget")}</Field>
          <Field label="Essentials allocated">{num("ess_allocated")}</Field>
          <Field label="Essentials spent">{num("ess_spent")}</Field>
          <Field label="Fun allocated">{num("fun_allocated")}</Field>
          <Field label="Fun spent">{num("fun_spent")}</Field>
          <Field label="Short-Term Savings allocated">{num("sts_allocated")}</Field>
          <Field label="Short-Term Savings contributed">{num("sts_spent")}</Field>
          <Field label="Vacation balance">{num("vac_balance")}</Field>
          <Field label="Short-Term Savings balance">{num("sts_balance")}</Field>
          <Field label="Long-Term Savings contribution">{num("lts_contribution")}</Field>
          <Field label="Long-Term Savings balance">{num("lts_balance")}</Field>
          <Field label="Fidelity balance">{num("fed_balance")}</Field>
          <Field label="Fidelity earnings">{num("fed_earnings")}</Field>
          <Field label="Regions balance">{num("regions_balance")}</Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete month?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => {
            if (!form.month) return;
            await upsert.mutateAsync(form as any);
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Full Financial Rules & Settings panel.
function SettingsDialog({ open, settingsRow, onClose }: { open: boolean; settingsRow: ReturnType<typeof useFinanceSettings>["data"]; onClose: () => void }) {
  const upsert = useUpsertFinanceSettings();
  const [rules, setRules] = useState<FinanceRules>(DEFAULT_RULES);
  useEffect(() => {
    if (settingsRow) {
      setRules({
        ...DEFAULT_RULES,
        ...((settingsRow.rules ?? {}) as Partial<FinanceRules>),
        fun_to_vac_pct: Number(settingsRow.fun_to_vacation_pct ?? DEFAULT_RULES.fun_to_vac_pct),
        fun_to_sts_pct: Number(settingsRow.fun_to_sts_pct ?? DEFAULT_RULES.fun_to_sts_pct),
        fun_to_fun_pct: Number(settingsRow.fun_to_fun_pct ?? DEFAULT_RULES.fun_to_fun_pct),
      });
    }
  }, [settingsRow, open]);
  const setR = <K extends keyof FinanceRules>(k: K, v: FinanceRules[K]) => setRules({ ...rules, [k]: v });
  const funTotal = rules.fun_to_vac_pct + rules.fun_to_sts_pct + rules.fun_to_fun_pct;
  const allocTotal = rules.ess_pct + rules.fun_pct + rules.sts_pct;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-2xl">
        <DialogHeader>
          <DialogTitle>Financial Rules &amp; Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Budget formula</h3>
            <p className="text-xs text-muted-foreground">
              Budget = prior month Income − prior month Housing &amp; Utilities. That budget flows into
              Essentials, Fun, and Short-Term Savings by the percentages below.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Field label="Essentials %"><Input type="number" value={rules.ess_pct} onChange={(e) => setR("ess_pct", Number(e.target.value))} /></Field>
              <Field label="Fun %"><Input type="number" value={rules.fun_pct} onChange={(e) => setR("fun_pct", Number(e.target.value))} /></Field>
              <Field label="Short-Term Savings %"><Input type="number" value={rules.sts_pct} onChange={(e) => setR("sts_pct", Number(e.target.value))} /></Field>
            </div>
            <p className={`mt-1 text-xs ${allocTotal === 100 ? "text-muted-foreground" : "text-warning"}`}>Total: {allocTotal}%</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Leftover Fun money split</h3>
            <p className="text-xs text-muted-foreground">
              At the end of each month, unspent Fun money is redistributed:
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Field label="→ Vacation Fund %"><Input type="number" value={rules.fun_to_vac_pct} onChange={(e) => setR("fun_to_vac_pct", Number(e.target.value))} /></Field>
              <Field label="→ Short-Term Savings %"><Input type="number" value={rules.fun_to_sts_pct} onChange={(e) => setR("fun_to_sts_pct", Number(e.target.value))} /></Field>
              <Field label="→ Next month Fun %"><Input type="number" value={rules.fun_to_fun_pct} onChange={(e) => setR("fun_to_fun_pct", Number(e.target.value))} /></Field>
            </div>
            <p className={`mt-1 text-xs ${funTotal === 100 ? "text-muted-foreground" : "text-warning"}`}>Total: {funTotal}%</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Starting balances</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Regions Checking"><Input type="number" step="0.01" value={rules.starting_regions} onChange={(e) => setR("starting_regions", Number(e.target.value))} /></Field>
              <Field label="Fidelity Investments"><Input type="number" step="0.01" value={rules.starting_fed} onChange={(e) => setR("starting_fed", Number(e.target.value))} /></Field>
              <Field label="Long-Term Savings"><Input type="number" step="0.01" value={rules.starting_lts} onChange={(e) => setR("starting_lts", Number(e.target.value))} /></Field>
              <Field label="Vacation Fund"><Input type="number" step="0.01" value={rules.starting_vac} onChange={(e) => setR("starting_vac", Number(e.target.value))} /></Field>
              <Field label="Short-Term Savings"><Input type="number" step="0.01" value={rules.starting_sts} onChange={(e) => setR("starting_sts", Number(e.target.value))} /></Field>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Month closing &amp; rounding</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rounding">
                <Select value={rules.rounding} onValueChange={(v) => setR("rounding", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cent">Nearest cent</SelectItem>
                    <SelectItem value="dollar">Nearest dollar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rules.auto_close_month} onChange={(e) => setR("auto_close_month", e.target.checked)} />
                Auto-close previous month on the 1st
              </label>
            </div>
          </section>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            await upsert.mutateAsync({
              rules: rules as any,
              fun_to_vacation_pct: rules.fun_to_vac_pct,
              fun_to_sts_pct: rules.fun_to_sts_pct,
              fun_to_fun_pct: rules.fun_to_fun_pct,
            });
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Excel import wizard --------------------------------------------------
type ParsedRow = {
  month: string;
  income: number;
  housing: number;
  budget: number;
  ess_allocated: number;
  ess_spent: number;
  fun_allocated: number;
  fun_spent: number;
  sts_allocated: number;
  sts_spent: number;
  vac_balance: number;
  sts_balance: number;
  lts_contribution: number;
  lts_balance: number;
  fed_balance: number;
  fed_earnings: number;
  regions_balance: number;
};

function toNum(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

/** Guess a real month cell like "Sep", "Jan '26". Returns a YYYY-MM-01 string when we can. */
function parseMonthCell(cell: any, defaultYear: number): string | null {
  if (cell == null) return null;
  const s = String(cell).trim();
  const map: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
    jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const m = s.match(/([A-Za-z]+)\s*'?\s*(\d{2,4})?/);
  if (!m) return null;
  const monthIdx = map[m[1].toLowerCase()];
  if (!monthIdx) return null;
  let year = defaultYear;
  if (m[2]) { year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]); }
  return `${year}-${String(monthIdx).padStart(2, "0")}-01`;
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [defaultYear, setDefaultYear] = useState<number>(new Date().getFullYear());
  const inputRef = useRef<HTMLInputElement>(null);
  const importer = useBulkImportMonthlySummaries();

  useEffect(() => { if (!open) { setRows([]); setStep("upload"); setFilename(""); } }, [open]);

  async function handleFile(file: File) {
    setFilename(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellFormula: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Reads computed values by default. Grab a matrix.
    const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    // Header assumed on first row: Month | Income | Rent + Utilities | Budget | STS | STS Spent | ESS | ESS Spent | FUN | FUN Spent | VAC | TOT STS | LTS | TOT LTS | FED | Regions | ... | FED Earnings
    const parsed: ParsedRow[] = [];
    for (let i = 1; i < matrix.length; i++) {
      const r = matrix[i] ?? [];
      const month = parseMonthCell(r[0], defaultYear);
      if (!month) continue;
      // If any of the money columns is 0/missing across the row we still keep it.
      const row: ParsedRow = {
        month,
        income: toNum(r[1]),
        housing: toNum(r[2]),
        budget: toNum(r[3]),
        sts_allocated: toNum(r[4]),
        sts_spent: toNum(r[5]),
        ess_allocated: toNum(r[6]),
        ess_spent: toNum(r[7]),
        fun_allocated: toNum(r[8]),
        fun_spent: toNum(r[9]),
        vac_balance: toNum(r[10]),
        sts_balance: toNum(r[11]),
        lts_contribution: toNum(r[12]),
        lts_balance: toNum(r[13]),
        fed_balance: toNum(r[14]),
        regions_balance: toNum(r[15]),
        fed_earnings: toNum(r[18]),
      };
      if (row.income || row.housing || row.budget || row.lts_balance || row.fed_balance || row.regions_balance) {
        parsed.push(row);
      }
    }
    setRows(parsed);
    setStep("preview");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="size-5" /> Import from Excel / CSV</DialogTitle>
        </DialogHeader>
        {step === "upload" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload your budget workbook. Atlas detects Month, Income, Rent + Utilities (→ Housing &amp; Utilities), Budget,
              STS/ESS/FUN allocated + spent, Vacation, Long-Term Savings, Fidelity, Regions, and FED Earnings columns.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Default year (for month labels without a year)">
                <Input type="number" value={defaultYear} onChange={(e) => setDefaultYear(Number(e.target.value))} />
              </Field>
            </div>
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
              <FileSpreadsheet className="mx-auto size-8 text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Drop a .xlsx or .csv here, or</p>
              <Button className="mt-3" onClick={() => inputRef.current?.click()}>Choose file</Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{filename}</span> · detected <b>{rows.length}</b> month{rows.length === 1 ? "" : "s"}. Review, then import.
            </p>
            <div className="max-h-96 overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="p-2 text-left">Month</th>
                    <th className="p-2 text-right">Income</th>
                    <th className="p-2 text-right">Housing</th>
                    <th className="p-2 text-right">Budget</th>
                    <th className="p-2 text-right">ESS spent</th>
                    <th className="p-2 text-right">FUN spent</th>
                    <th className="p-2 text-right">STS bal</th>
                    <th className="p-2 text-right">VAC bal</th>
                    <th className="p-2 text-right">LTS bal</th>
                    <th className="p-2 text-right">FED bal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.month} className="border-t border-white/5">
                      <td className="p-2 font-mono">{monthLabel(r.month)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.income)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.housing)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.budget)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.ess_spent)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.fun_spent)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.sts_balance)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.vac_balance)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.lts_balance)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.fed_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Detected rules from your workbook</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li>Budget = prior month Income − prior month Housing &amp; Utilities</li>
                <li>Essentials 40%, Fun 25%, Short-Term Savings 35% of Budget</li>
                <li>Leftover Fun → 70% Vacation, 25% Short-Term Savings, 5% next month Fun</li>
                <li>Cumulative balances tracked for VAC, STS, LTS, FED, Regions</li>
              </ul>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
              <Button
                onClick={async () => {
                  await importer.mutateAsync(rows as any);
                  onClose();
                }}
                disabled={importer.isPending || rows.length === 0}
              >
                Import {rows.length} month{rows.length === 1 ? "" : "s"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
