// Shared finance derivations. Single source of truth for both the Finances
// module (`/money`) and the dashboard Financial Core widget. All math lives in
// `finance-engine.ts`; this hook just wires it to the data layer.
import { useMemo } from "react";
import {
  useAccounts, useTransactions, useBudgets,
  useMonthlySummaries, useBalanceSnapshots, useFinanceSettings,
  accountBalance, DEFAULT_RULES,
  type Account, type BudgetCategory, type MonthlySummary, type BalanceSnapshot, type FinanceRules,
} from "@/lib/atlas-data";
import {
  computeFinance, monthKeyOf, monthLabel, monthOfDate, parseLocalDate,
  type MonthDerived, type FinanceRulesFull,
} from "@/lib/finance-engine";

export { monthKeyOf, monthLabel, monthOfDate, parseLocalDate };
export type { MonthDerived };

export const SERIES_COLOR: Record<string, string> = {
  HOU: "#f59e0b",
  ESS: "#38bdf8",
  FUN: "#a78bfa",
  STS: "#22d3ee",
  VAC: "#f472b6",
  LTS: "#fbbf24",
  FED: "#34d399",
  RSU: "#c084fc",
  Regions: "#94a3b8",
};

export const CATEGORY_LABELS: Record<string, { long: string; short: string }> = {
  HOU: { long: "Housing & Utilities", short: "HOU" },
  ESS: { long: "Essentials", short: "ESS" },
  FUN: { long: "Fun", short: "FUN" },
  STS: { long: "Short-Term Savings", short: "STS" },
  VAC: { long: "Vacation Fund", short: "VAC" },
  LTS: { long: "Long-Term Savings (401(k))", short: "LTS" },
  FED: { long: "Fidelity Investments", short: "FED" },
  RSU: { long: "Restricted Stock Units", short: "RSU" },
};

/** Merge stored rules JSONB with defaults, tolerating the legacy shape. */
export function resolveRules(raw: unknown): FinanceRules {
  const r = { ...DEFAULT_RULES, ...((raw as Partial<FinanceRules>) ?? {}) };
  if (r.fun_to_budget_pct == null && r.fun_to_fun_pct != null) r.fun_to_budget_pct = r.fun_to_fun_pct;
  return r;
}

export const engineRules = (r: FinanceRules): FinanceRulesFull => ({
  ess_pct: Number(r.ess_pct),
  fun_pct: Number(r.fun_pct),
  sts_pct: Number(r.sts_pct),
  fun_to_vac_pct: Number(r.fun_to_vac_pct),
  fun_to_budget_pct: Number(r.fun_to_budget_pct),
  fun_to_sts_pct: Number(r.fun_to_sts_pct),
});

export type FinanceSummary = {
  loading: boolean;
  netWorth: number;
  monthlyBudget: number;
  budgetIsSet: boolean;
  budgetIsOverride: boolean;
  monthlySpent: number;
  remainingBudget: number;
  nextMonthIncome: number;
  priorMonthLabel: string;
  currentSummary: MonthlySummary | null;
  current: MonthDerived | null;
  previous: MonthDerived | null;
  months: MonthDerived[];
  balanceByCode: Record<string, number>;
  spentByCode: Record<string, number>;
  contribByCode: Record<string, number>;
  allocByCode: Record<string, number>;
  rules: FinanceRules;
  budgets: BudgetCategory[];
  accounts: Account[];
  summaries: MonthlySummary[];
  snapshots: BalanceSnapshot[];
};

/**
 * Consolidated finance state, recomputed live from transactions + rules.
 */
export function useFinanceSummary(): FinanceSummary {
  const accounts = useAccounts();
  const txns = useTransactions();
  const budgets = useBudgets();
  const summaries = useMonthlySummaries();
  const snapshots = useBalanceSnapshots();
  const settings = useFinanceSettings();

  const allAccounts = accounts.data ?? [];
  const allTxns = txns.data ?? [];
  const allBudgets = budgets.data ?? [];
  const allSummaries = summaries.data ?? [];
  const allSnapshots = snapshots.data ?? [];
  const rules = useMemo(() => resolveRules(settings.data?.rules), [settings.data?.rules]);

  return useMemo(() => {
    const result = computeFinance({
      transactions: allTxns,
      categories: allBudgets,
      summaries: allSummaries,
      accounts: allAccounts,
      snapshots: allSnapshots,
      rules: engineRules(rules),
      budgetOverrides: rules.budget_overrides ?? {},
    });

    const now = new Date();
    const curMonthKey = monthKeyOf(now);
    const cur = result.current;
    const latest = result.months.at(-1) ?? null;
    const balanceByCode: Record<string, number> = { ...(latest?.balances ?? {}) };

    // Net worth = every account balance PLUS any derived balance code that has
    // no matching account row yet (imported history still counts).
    const accountsTotal = allAccounts.reduce((s, a) => s + accountBalance(a, allTxns), 0);
    const has = (re: RegExp, type?: Account["type"]) =>
      allAccounts.some((a) => re.test(a.name) || (type ? a.type === type : false));
    const fallback =
      (has(/regions/i, "checking") ? 0 : balanceByCode.Regions ?? 0) +
      (has(/fidelity|brokerage/i, "investment") ? 0 : balanceByCode.FED ?? 0) +
      (has(/401|retirement/i, "retirement") ? 0 : balanceByCode.LTS ?? 0) +
      (has(/rsu|stock|equity|restricted/i) ? 0 : balanceByCode.RSU ?? 0) +
      (has(/vacation|\bvac\b/i) ? 0 : balanceByCode.VAC ?? 0) +
      (has(/short.?term|\bsts\b/i) ? 0 : balanceByCode.STS ?? 0);

    const monthlyBudget = cur?.budget ?? 0;
    const monthlySpent = cur ? cur.spent.HOU + cur.spent.ESS + cur.spent.FUN : 0;
    const nextMonthIncome = cur?.income ?? 0;

    return {
      loading: accounts.isLoading || txns.isLoading || summaries.isLoading || budgets.isLoading,
      netWorth: accountsTotal + fallback,
      monthlyBudget,
      budgetIsSet: monthlyBudget > 0,
      budgetIsOverride: !!cur?.budgetIsOverride,
      monthlySpent,
      remainingBudget: monthlyBudget - (cur ? cur.spent.ESS + cur.spent.FUN : 0),
      nextMonthIncome,
      priorMonthLabel: new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toLocaleString("en-US", { month: "long" }),
      currentSummary: allSummaries.find((s) => s.month === curMonthKey) ?? null,
      current: cur,
      previous: result.previous,
      months: result.months,
      balanceByCode,
      spentByCode: cur?.spent ?? { HOU: 0, ESS: 0, FUN: 0 },
      contribByCode: cur?.contrib ?? { STS: 0, LTS: 0, FED: 0, RSU: 0 },
      allocByCode: {
        HOU: cur?.spent.HOU ?? 0,
        ESS: cur?.alloc.ESS ?? 0,
        FUN: cur?.alloc.FUN ?? 0,
        STS: cur?.alloc.STS ?? 0,
      },
      rules,
      budgets: allBudgets,
      accounts: allAccounts,
      summaries: allSummaries,
      snapshots: allSnapshots,
    };
  }, [
    allAccounts, allTxns, allBudgets, allSummaries, allSnapshots, rules,
    accounts.isLoading, txns.isLoading, summaries.isLoading, budgets.isLoading,
  ]);
}
