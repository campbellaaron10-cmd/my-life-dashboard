import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Wallet, TrendingUp, TrendingDown } from "lucide-react";
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
  accountBalance, budgetSpent,
  type Account, type Transaction, type BudgetCategory,
} from "@/lib/atlas-data";
import { PrivacyGuard } from "@/context/PrivacyMode";

export const Route = createFileRoute("/_authenticated/money")({
  head: () => ({ meta: [{ title: "Money — Atlas" }] }),
  component: MoneyPage,
});

const ACCOUNT_TYPES = ["checking", "savings", "credit", "investment", "retirement", "cash", "other"] as const;
const TXN_TYPES = ["expense", "income", "transfer"] as const;
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function MoneyPage() {
  return (
    <PrivacyGuard
      sensitivity="private-only"
      fallback={
        <GlassCard className="text-center">
          <h1 className="text-2xl font-semibold">Money is hidden</h1>
          <p className="mt-2 text-muted-foreground">Switch Privacy Mode to Private to view finances.</p>
        </GlassCard>
      }
    >
      <MoneyDashboard />
    </PrivacyGuard>
  );
}

function MoneyDashboard() {
  const accounts = useAccounts();
  const txns = useTransactions();
  const budgets = useBudgets();
  const [accountDialog, setAccountDialog] = useState<Partial<Account> | null>(null);
  const [txnDialog, setTxnDialog] = useState<Partial<Transaction> | null>(null);
  const [budgetDialog, setBudgetDialog] = useState<Partial<BudgetCategory> | null>(null);

  const netWorth = useMemo(
    () => (accounts.data ?? []).reduce((s, a) => s + accountBalance(a, txns.data ?? []), 0),
    [accounts.data, txns.data],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Financial Core</p>
          <h1 className="text-4xl font-bold tracking-tight">Money</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Net Worth</p>
          <p className="font-mono text-3xl font-bold">{fmt(netWorth)}</p>
        </div>
      </header>

      {/* Accounts */}
      <GlassCard>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Accounts</h2>
          <Button size="sm" onClick={() => setAccountDialog({ type: "checking" })}>
            <Plus className="mr-1 size-4" /> Account
          </Button>
        </div>
        {accounts.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (accounts.data ?? []).length === 0 ? (
          <EmptyState icon={Wallet} text="No accounts yet. Add your first to start tracking." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {accounts.data!.map((a) => {
              const bal = accountBalance(a, txns.data ?? []);
              return (
                <div key={a.id} className="group rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {a.type} · {a.institution ?? "—"}
                      </p>
                      <p className="mt-1 text-lg font-semibold">{a.name}</p>
                    </div>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setAccountDialog(a)}>
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold">{fmt(bal)}</p>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Budgets */}
      <GlassCard>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Monthly Budgets</h2>
          <Button size="sm" variant="secondary" onClick={() => setBudgetDialog({})}>
            <Plus className="mr-1 size-4" /> Budget
          </Button>
        </div>
        {(budgets.data ?? []).length === 0 ? (
          <EmptyState text="Create budget categories like ESS, FUN, VAC to track spending." />
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            {budgets.data!.map((c) => {
              const spent = budgetSpent(c, txns.data ?? []);
              const pct = c.monthly_limit > 0 ? Math.min(100, (spent / Number(c.monthly_limit)) * 100) : 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setBudgetDialog(c)}
                  className="text-left transition-opacity hover:opacity-90"
                >
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {c.code} · {c.name}
                    </span>
                    <span className="font-mono text-xs">{fmt(spent)} / {fmt(Number(c.monthly_limit))}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full transition-all ${pct >= 100 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Transactions */}
      <GlassCard>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <Button
            size="sm"
            onClick={() => setTxnDialog({ type: "expense", occurred_on: new Date().toISOString().slice(0, 10) })}
            disabled={!(accounts.data ?? []).length}
          >
            <Plus className="mr-1 size-4" /> Transaction
          </Button>
        </div>
        {(txns.data ?? []).length === 0 ? (
          <EmptyState text="Log your first transaction to see it here and roll into budgets." />
        ) : (
          <div className="space-y-1">
            {txns.data!.map((t) => {
              const acc = accounts.data?.find((a) => a.id === t.account_id);
              const cat = budgets.data?.find((b) => b.id === t.category_id);
              return (
                <div
                  key={t.id}
                  className="group grid grid-cols-[88px_1fr_1fr_120px_32px] items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/5"
                >
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {new Date(t.occurred_on).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <button className="text-left font-medium hover:underline" onClick={() => setTxnDialog(t)}>
                    {t.merchant}
                  </button>
                  <span className="truncate text-sm text-muted-foreground">
                    {cat?.code ?? "—"} · {acc?.name ?? "—"}
                  </span>
                  <span className={`flex items-center justify-end gap-1 font-mono text-sm ${t.type === "income" ? "text-success" : ""}`}>
                    {t.type === "income" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3 opacity-40" />}
                    {t.type === "income" ? "+" : "-"}
                    {fmt(Math.abs(Number(t.amount))).replace("$", "$")}
                  </span>
                  <TrashButton id={t.id} deleter={useDeleteTransaction} />
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <AccountDialog open={accountDialog !== null} initial={accountDialog} onClose={() => setAccountDialog(null)} />
      <TxnDialog
        open={txnDialog !== null}
        initial={txnDialog}
        accounts={accounts.data ?? []}
        categories={budgets.data ?? []}
        onClose={() => setTxnDialog(null)}
      />
      <BudgetDialog open={budgetDialog !== null} initial={budgetDialog} onClose={() => setBudgetDialog(null)} />
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon?: typeof Wallet; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
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
function AccountDialog({ open, initial, onClose }: { open: boolean; initial: Partial<Account> | null; onClose: () => void }) {
  const upsert = useUpsertAccount();
  const del = useDeleteAccount();
  const [form, setForm] = useState<Partial<Account>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type ?? "checking"} onValueChange={(v) => setForm({ ...form, type: v as Account["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Institution"><Input value={form.institution ?? ""} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field>
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

function TxnDialog({ open, initial, accounts, categories, onClose }: { open: boolean; initial: Partial<Transaction> | null; accounts: Account[]; categories: BudgetCategory[]; onClose: () => void }) {
  const upsert = useUpsertTransaction();
  const del = useDeleteTransaction();
  const [form, setForm] = useState<Partial<Transaction>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Transaction" : "New Transaction"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Merchant"><Input value={form.merchant ?? ""} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></Field>
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
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Uncategorized</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
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

function BudgetDialog({ open, initial, onClose }: { open: boolean; initial: Partial<BudgetCategory> | null; onClose: () => void }) {
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();
  const [form, setForm] = useState<Partial<BudgetCategory>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Budget" : "New Budget"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code"><Input maxLength={4} value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
            <div className="col-span-2"><Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          </div>
          <Field label="Monthly limit">
            <Input type="number" step="0.01" value={form.monthly_limit ?? 0} onChange={(e) => setForm({ ...form, monthly_limit: Number(e.target.value) })} />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && <Button variant="destructive" onClick={() => { if (confirm("Delete?")) { del.mutate(initial.id!); onClose(); } }}>Delete</Button>}
          <Button onClick={async () => { if (!form.code || !form.name) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
