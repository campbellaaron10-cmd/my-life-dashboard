// Shared finance derivations. Single source of truth for both the Finances
// module (`/money`) and the dashboard Financial Core widget.
import { useMemo } from "react";
import {
  useAccounts, useTransactions, useBudgets,
  useMonthlySummaries, useBalanceSnapshots,
  accountBalance,
  type Account, type BudgetCategory, type MonthlySummary, type BalanceSnapshot,
} from "@/lib/atlas-data";

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

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export type FinanceSummary = {
  loading: boolean;
  netWorth: number;
  monthlyBudget: number;
  budgetIsSet: boolean;
  monthlySpent: number;
  remainingBudget: number;
  nextMonthIncome: number;
  priorMonthLabel: string;
  currentSummary: MonthlySummary | null;
  balanceByCode: Record<string, number>;
  spentByCode: Record<string, number>;
  contribByCode: Record<string, number>;
  allocByCode: Record<string, number>;
  budgets: BudgetCategory[];
  accounts: Account[];
  summaries: MonthlySummary[];
  snapshots: BalanceSnapshot[];
};

/**
 * Consolidated finance state derived from accounts, transactions, budgets,
 * and stored monthly summaries. Values mirror the Finances module exactly.
 */
export function useFinanceSummary(): FinanceSummary {
  const accounts = useAccounts();
  const txns = useTransactions();
  const budgets = useBudgets();
  const summaries = useMonthlySummaries();
  const snapshots = useBalanceSnapshots();

  const allAccounts = accounts.data ?? [];
  const allTxns = txns.data ?? [];
  const allBudgets = budgets.data ?? [];
  const allSummaries = summaries.data ?? [];

  return useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const curMonthKey = monthKey(monthStart);

    const netWorth = allAccounts.reduce((s, a) => s + accountBalance(a, allTxns), 0);

    const currentSummary = allSummaries.find((s) => s.month === curMonthKey) ?? null;
    const latestSummary = allSummaries.at(-1) ?? null;
    const monthlyBudget = currentSummary ? Number(currentSummary.budget) : 0;
    const budgetIsSet = !!currentSummary;

    const spentByCode: Record<string, number> = {
      HOU: Number(currentSummary?.housing ?? 0),
      ESS: Number(currentSummary?.ess_spent ?? 0),
      FUN: Number(currentSummary?.fun_spent ?? 0),
    };
    const contribByCode: Record<string, number> = {
      STS: Number(currentSummary?.sts_spent ?? 0),
      LTS: Number(currentSummary?.lts_contribution ?? 0),
      FED: Number(currentSummary?.fed_earnings ?? 0),
      RSU: Number(currentSummary?.rsu_contribution ?? 0),
    };
    const allocByCode: Record<string, number> = {
      HOU: Number(currentSummary?.housing ?? 0),
      ESS: Number(currentSummary?.ess_allocated ?? 0),
      FUN: Number(currentSummary?.fun_allocated ?? 0),
      STS: Number(currentSummary?.sts_allocated ?? 0),
    };
    const balanceByCode: Record<string, number> = {
      STS: Number(latestSummary?.sts_balance ?? 0),
      VAC: Number(latestSummary?.vac_balance ?? 0),
      LTS: Number(latestSummary?.lts_balance ?? 0),
      FED: Number(latestSummary?.fed_balance ?? 0),
      RSU: Number((latestSummary as any)?.rsu_balance ?? 0),
      Regions: Number(latestSummary?.regions_balance ?? 0),
    };

    const summarySpendTotal = spentByCode.HOU + spentByCode.ESS + spentByCode.FUN;
    const liveMonthlySpent = allTxns
      .filter((t) => t.type === "expense" &&
        new Date(t.occurred_on) >= monthStart &&
        new Date(t.occurred_on) < nextMonthStart)
      .reduce((s, t) => s + Number(t.amount), 0);
    const monthlySpent = summarySpendTotal > 0 ? summarySpendTotal : liveMonthlySpent;

    const nextMonthIncome = allTxns
      .filter((t) => t.type === "income" &&
        new Date(t.occurred_on) >= monthStart &&
        new Date(t.occurred_on) < nextMonthStart)
      .reduce((s, t) => s + Number(t.amount), 0);

    const priorMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toLocaleString("en-US", { month: "long" });

    return {
      loading: accounts.isLoading || txns.isLoading || summaries.isLoading || budgets.isLoading,
      netWorth,
      monthlyBudget,
      budgetIsSet,
      monthlySpent,
      remainingBudget: monthlyBudget - monthlySpent,
      nextMonthIncome,
      priorMonthLabel,
      currentSummary,
      balanceByCode,
      spentByCode,
      contribByCode,
      allocByCode,
      budgets: allBudgets,
      accounts: allAccounts,
      summaries: allSummaries,
      snapshots: snapshots.data ?? [],
    };
  }, [
    allAccounts, allTxns, allBudgets, allSummaries,
    snapshots.data,
    accounts.isLoading, txns.isLoading, summaries.isLoading, budgets.isLoading,
  ]);
}
