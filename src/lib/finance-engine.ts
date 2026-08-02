// Finance engine — the single source of truth for Atlas' budget math.
//
// Rules (all percentages user-editable in Financial Rules):
//   Budget(m)      = (Income(m-1) − Housing(m-1)) + Leftover Fun(m-1) × fun_to_budget_pct
//   ESS/FUN/STS    = Budget(m) × ess_pct / fun_pct / sts_pct
//   Leftover Fun   = max(0, FUN allocated − FUN spent)
//   Leftover split = fun_to_vac_pct → Vacation, fun_to_budget_pct → next Budget,
//                    fun_to_sts_pct → Short-Term Savings
//
// Months are recomputed live from transactions, so editing a transaction's date
// moves the money into the correct month and re-derives every later month.
// Months that predate any transaction fall back to the stored monthly summary
// (imported workbook history). A month's `budget` can be explicitly overridden.
import type {
  Account, Transaction, BudgetCategory, MonthlySummary, BalanceSnapshot,
} from "./atlas-data";

export type FinanceRulesFull = {
  ess_pct: number;
  fun_pct: number;
  sts_pct: number;
  fun_to_vac_pct: number;
  fun_to_budget_pct: number;
  fun_to_sts_pct: number;
};

export const DEFAULT_ENGINE_RULES: FinanceRulesFull = {
  ess_pct: 40, fun_pct: 25, sts_pct: 35,
  fun_to_vac_pct: 80, fun_to_budget_pct: 15, fun_to_sts_pct: 5,
};

export const BALANCE_CODES = ["VAC", "STS", "LTS", "FED", "RSU", "Regions"] as const;
export type BalanceCode = (typeof BALANCE_CODES)[number];

export type MonthDerived = {
  month: string;              // YYYY-MM-01
  isHistorical: boolean;      // no transactions exist at/after this month
  income: number;
  housing: number;
  budget: number;
  budgetIsOverride: boolean;
  alloc: { ESS: number; FUN: number; STS: number };
  spent: { HOU: number; ESS: number; FUN: number };
  contrib: { STS: number; LTS: number; FED: number; RSU: number };
  spentTotal: number;
  remaining: number;
  funLeftover: number;
  leftoverToVac: number;
  leftoverToBudget: number;
  leftoverToSts: number;
  balances: Record<BalanceCode, number>;
};

/** YYYY-MM-01 for a Date, in local time (never via toISOString). */
export const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

/** Month bucket for a stored date string — pure string math, so no timezone drift. */
export const monthOfDate = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Parse YYYY-MM-DD as a local date (avoids the UTC off-by-one of `new Date(iso)`). */
export const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

const addMonth = (key: string, n: number) => {
  const [y, m] = key.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + n, 1));
};

const zeroBalances = (): Record<BalanceCode, number> =>
  ({ VAC: 0, STS: 0, LTS: 0, FED: 0, RSU: 0, Regions: 0 });

export type EngineInput = {
  transactions: Transaction[];
  categories: BudgetCategory[];
  summaries: MonthlySummary[];
  accounts?: Account[];
  snapshots?: BalanceSnapshot[];
  rules: FinanceRulesFull;
  /** month (YYYY-MM-01) → manual budget override */
  budgetOverrides?: Record<string, number>;
};

export type EngineResult = {
  months: MonthDerived[];
  byMonth: Record<string, MonthDerived>;
  currentMonth: string;
  current: MonthDerived | null;
  previous: MonthDerived | null;
};

/**
 * Codes a monthly summary stores balances under.
 * Non-zero stored values act as anchors (they reset the running balance).
 */
const summaryBalance = (s: MonthlySummary | undefined, code: BalanceCode): number => {
  if (!s) return 0;
  const a = s as unknown as Record<string, unknown>;
  const key = ({
    VAC: "vac_balance", STS: "sts_balance", LTS: "lts_balance",
    FED: "fed_balance", RSU: "rsu_balance", Regions: "regions_balance",
  } as const)[code];
  return Number(a[key] ?? 0);
};

export function computeFinance(input: EngineInput): EngineResult {
  const { transactions, categories, summaries, snapshots = [], accounts = [], rules } = input;
  const overrides = input.budgetOverrides ?? {};

  const codeOf = new Map<string, string>();
  for (const c of categories) codeOf.set(c.id, c.code);

  // --- bucket every transaction into its month by string, so an edited date
  // instantly lands in the right month regardless of timezone.
  type Bucket = {
    income: number;
    spent: Record<string, number>;
    contrib: Record<string, number>;
    count: number;
  };
  const buckets = new Map<string, Bucket>();
  const bucket = (m: string): Bucket => {
    let b = buckets.get(m);
    if (!b) { b = { income: 0, spent: {}, contrib: {}, count: 0 }; buckets.set(m, b); }
    return b;
  };
  for (const t of transactions) {
    const m = monthOfDate(t.occurred_on);
    const b = bucket(m);
    b.count += 1;
    const amt = Math.abs(Number(t.amount));
    const code = t.category_id ? codeOf.get(t.category_id) : undefined;
    if (t.type === "income") b.income += amt;
    else if (t.type === "expense") { if (code) b.spent[code] = (b.spent[code] ?? 0) + amt; }
    else if (t.type === "savings_contribution" || t.type === "investment_contribution") {
      if (code) b.contrib[code] = (b.contrib[code] ?? 0) + amt;
    }
  }

  // --- snapshot balances per month per account name pattern
  const snapshotBalance = (m: string, patterns: RegExp[]): number | null => {
    const end = addMonth(m, 1);
    let best: BalanceSnapshot | null = null;
    for (const s of snapshots) {
      if (s.on_date >= end) continue;
      const acc = accounts.find((a) => a.id === s.account_id);
      const name = `${acc?.name ?? ""} ${s.label ?? ""}`;
      if (!patterns.some((p) => p.test(name))) continue;
      if (!best || s.on_date > best.on_date) best = s;
    }
    return best ? Number(best.balance) : null;
  };
  const SNAPSHOT_PATTERNS: Record<BalanceCode, RegExp[]> = {
    VAC: [/vacation/i], STS: [/short.?term/i], LTS: [/401|retirement|long.?term/i],
    FED: [/fidelity|brokerage/i], RSU: [/rsu|restricted|stock|equity/i], Regions: [/regions/i],
  };

  // --- month range
  const summaryMonths = summaries.map((s) => s.month);
  const txnMonths = [...buckets.keys()];
  const allKnown = [...summaryMonths, ...txnMonths].sort();
  const nowKey = monthKeyOf(new Date());
  const first = allKnown[0] ?? nowKey;
  const last = [...allKnown, nowKey].sort().at(-1) ?? nowKey;
  const firstLive = txnMonths.sort()[0] ?? null;

  const keys: string[] = [];
  for (let k = first; k <= last; k = addMonth(k, 1)) keys.push(k);

  const summaryOf = new Map(summaries.map((s) => [s.month, s]));
  const months: MonthDerived[] = [];
  let prev: MonthDerived | null = null;

  for (const month of keys) {
    const s = summaryOf.get(month);
    const b = buckets.get(month);
    const isHistorical = !firstLive || month < firstLive;

    const income = isHistorical ? Number(s?.income ?? 0) : (b?.income ?? 0);
    const housing = isHistorical ? Number(s?.housing ?? 0) : (b?.spent.HOU ?? 0);
    const essSpent = isHistorical ? Number(s?.ess_spent ?? 0) : (b?.spent.ESS ?? 0);
    const funSpent = isHistorical ? Number(s?.fun_spent ?? 0) : (b?.spent.FUN ?? 0);

    // Budget: explicit override > derived from prior month > stored history.
    const override = overrides[month];
    const derivedBudget = prev
      ? Math.max(0, (prev.income - prev.housing) + (prev.funLeftover * rules.fun_to_budget_pct) / 100)
      : 0;
    let budget: number;
    let budgetIsOverride = false;
    if (override != null && Number.isFinite(override)) {
      budget = override; budgetIsOverride = true;
    } else if (isHistorical) {
      budget = Number(s?.budget ?? 0) || derivedBudget;
    } else {
      budget = derivedBudget;
    }

    const alloc = isHistorical
      ? {
          ESS: Number(s?.ess_allocated ?? 0) || (budget * rules.ess_pct) / 100,
          FUN: Number(s?.fun_allocated ?? 0) || (budget * rules.fun_pct) / 100,
          STS: Number(s?.sts_allocated ?? 0) || (budget * rules.sts_pct) / 100,
        }
      : {
          ESS: (budget * rules.ess_pct) / 100,
          FUN: (budget * rules.fun_pct) / 100,
          STS: (budget * rules.sts_pct) / 100,
        };

    const funLeftover = Math.max(0, alloc.FUN - funSpent);
    const leftoverToVac = (funLeftover * rules.fun_to_vac_pct) / 100;
    const leftoverToBudget = (funLeftover * rules.fun_to_budget_pct) / 100;
    const leftoverToSts = (funLeftover * rules.fun_to_sts_pct) / 100;

    const contrib = {
      STS: isHistorical ? Number(s?.sts_spent ?? 0) : (b?.contrib.STS ?? alloc.STS),
      LTS: isHistorical ? Number(s?.lts_contribution ?? 0) : (b?.contrib.LTS ?? 0),
      FED: isHistorical ? Number(s?.fed_earnings ?? 0) : (b?.contrib.FED ?? 0),
      RSU: isHistorical ? Number((s as any)?.rsu_contribution ?? 0) : (b?.contrib.RSU ?? 0),
    };

    // Balances: a non-zero stored summary value or a balance snapshot anchors the
    // series; otherwise carry the prior month forward and add this month's flows.
    const balances = zeroBalances();
    for (const code of BALANCE_CODES) {
      const stored = summaryBalance(s, code);
      const snap = snapshotBalance(month, SNAPSHOT_PATTERNS[code]);
      if (stored) { balances[code] = stored; continue; }
      if (snap != null && !isHistorical) { balances[code] = snap; continue; }
      const base = prev ? prev.balances[code] : 0;
      if (code === "VAC") balances[code] = base + leftoverToVac;
      else if (code === "STS") balances[code] = base + contrib.STS + leftoverToSts;
      else if (code === "LTS") balances[code] = base + contrib.LTS;
      else if (code === "FED") balances[code] = base + contrib.FED;
      else if (code === "RSU") balances[code] = base + contrib.RSU;
      else balances[code] = base;
    }

    const spentTotal = housing + essSpent + funSpent;
    const row: MonthDerived = {
      month, isHistorical,
      income, housing, budget, budgetIsOverride,
      alloc,
      spent: { HOU: housing, ESS: essSpent, FUN: funSpent },
      contrib,
      spentTotal,
      remaining: budget - (essSpent + funSpent),
      funLeftover, leftoverToVac, leftoverToBudget, leftoverToSts,
      balances,
    };
    months.push(row);
    prev = row;
  }

  const byMonth: Record<string, MonthDerived> = {};
  for (const m of months) byMonth[m.month] = m;
  const idx = months.findIndex((m) => m.month === nowKey);
  return {
    months,
    byMonth,
    currentMonth: nowKey,
    current: idx >= 0 ? months[idx] : null,
    previous: idx > 0 ? months[idx - 1] : (months.at(-2) ?? null),
  };
}
