// Central query keys + hooks for all Atlas modules.
// All CRUD runs through the browser Supabase client; RLS scopes rows to auth.uid().
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Tables = Database["public"]["Tables"];

export type Account = Tables["accounts"]["Row"];
export type Transaction = Tables["transactions"]["Row"];
export type BudgetCategory = Tables["budget_categories"]["Row"];
export type PantryItem = Tables["pantry_items"]["Row"];
export type GroceryItem = Tables["grocery_items"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type ActivityEvent = Tables["activity_events"]["Row"];
export type Food = Tables["foods"]["Row"];
export type Recipe = Tables["recipes"]["Row"];
export type RecipeIngredient = Tables["recipe_ingredients"]["Row"];

export const qk = {
  accounts: ["accounts"] as const,
  transactions: (limit?: number) => ["transactions", limit ?? "all"] as const,
  budgets: ["budget_categories"] as const,
  pantry: ["pantry_items"] as const,
  grocery: ["grocery_items"] as const,
  tasks: ["tasks"] as const,
  activity: ["activity_events"] as const,
  foods: ["foods"] as const,
  recipes: ["recipes"] as const,
  recipeIngredients: (recipeId: string) => ["recipe_ingredients", recipeId] as const,
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ---------- Accounts ----------
export function useAccounts() {
  return useQuery({
    queryKey: qk.accounts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_archived", false)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useUpsertAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Account> & { name: string; type: Account["type"] }) => {
      const user_id = await currentUserId();
      const payload = { ...input, user_id };
      const { data, error } = await supabase.from("accounts").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Account saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Account deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Transactions ----------
export function useTransactions(limit?: number) {
  return useQuery({
    queryKey: qk.transactions(limit),
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useUpsertTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Transaction> & { merchant: string; amount: number; account_id: string }) => {
      const user_id = await currentUserId();
      const payload = { ...input, user_id };
      const { data, error } = await supabase.from("transactions").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.activity });
      toast.success("Transaction saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Transaction removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Budget categories ----------
export function useBudgets() {
  return useQuery({
    queryKey: qk.budgets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("is_archived", false)
        .order("sort_order");
      if (error) throw error;
      return data as BudgetCategory[];
    },
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BudgetCategory> & { code: string; name: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase.from("budget_categories").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budgets });
      toast.success("Budget saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budgets });
      toast.success("Budget removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Pantry ----------
export function usePantry(opts?: UseQueryOptions<PantryItem[]>) {
  return useQuery<PantryItem[]>({
    queryKey: qk.pantry,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("is_consumed", false)
        .order("expires_on", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as PantryItem[];
    },
    ...opts,
  });
}

export function useUpsertPantry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PantryItem> & { name: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase.from("pantry_items").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pantry });
      toast.success("Pantry updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePantry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pantry_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.pantry });
      toast.success("Item removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Grocery ----------
export function useGrocery() {
  return useQuery({
    queryKey: qk.grocery,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_items")
        .select("*")
        .order("is_checked")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as GroceryItem[];
    },
  });
}

export function useUpsertGrocery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<GroceryItem> & { name: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase.from("grocery_items").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.grocery }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGrocery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grocery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.grocery }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Tasks ----------
export function useTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("is_done")
        .order("due_on", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useUpsertTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Task> & { title: string }) => {
      const user_id = await currentUserId();
      const patch = { ...input, user_id };
      if (patch.is_done && !patch.completed_at) patch.completed_at = new Date().toISOString();
      if (patch.is_done === false) patch.completed_at = null;
      const { data, error } = await supabase.from("tasks").upsert(patch).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Derived ----------
export function accountBalance(account: Account, txns: Transaction[]): number {
  const delta = txns
    .filter((t) => t.account_id === account.id)
    .reduce((sum, t) => {
      if (t.type === "income") return sum + Number(t.amount);
      if (t.type === "expense") return sum - Number(t.amount);
      return sum;
    }, 0);
  return Number(account.starting_balance) + delta;
}

export function budgetSpent(cat: BudgetCategory, txns: Transaction[]): number {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return txns
    .filter((t) => t.category_id === cat.id && t.type === "expense" && new Date(t.occurred_on) >= start)
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
