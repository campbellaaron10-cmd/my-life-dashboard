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

// ---------- Foods ----------
export function useFoods(search?: string) {
  return useQuery({
    queryKey: [...qk.foods, search ?? ""] as const,
    queryFn: async () => {
      let q = supabase.from("foods").select("*").eq("is_archived", false).order("name").limit(200);
      if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Food[];
    },
  });
}

export function useUpsertFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Food> & { name: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase.from("foods").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data as Food;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.foods });
      toast.success("Food saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("foods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.foods });
      qc.invalidateQueries({ queryKey: qk.pantry });
      toast.success("Food removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Recipes ----------
export function useRecipes() {
  return useQuery({
    queryKey: qk.recipes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes").select("*").eq("is_archived", false).order("title");
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ["recipes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Recipe;
    },
  });
}

export function useUpsertRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Recipe> & { title: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase.from("recipes").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data as Recipe;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.recipes });
      qc.invalidateQueries({ queryKey: ["recipes", r.id] });
      toast.success("Recipe saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recipes });
      toast.success("Recipe removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Recipe Ingredients ----------
export function useRecipeIngredients(recipeId: string | undefined) {
  return useQuery({
    queryKey: recipeId ? qk.recipeIngredients(recipeId) : ["recipe_ingredients", "none"],
    enabled: !!recipeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId!)
        .order("sort_order");
      if (error) throw error;
      return data as RecipeIngredient[];
    },
  });
}

export function useUpsertIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RecipeIngredient> & { recipe_id: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase.from("recipe_ingredients").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data as RecipeIngredient;
    },
    onSuccess: (row) => qc.invalidateQueries({ queryKey: qk.recipeIngredients(row.recipe_id) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: RecipeIngredient) => {
      const { error } = await supabase.from("recipe_ingredients").delete().eq("id", row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => qc.invalidateQueries({ queryKey: qk.recipeIngredients(row.recipe_id) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Nutrition math ----------
import { toGrams } from "./units";

export type NutritionTotals = {
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  fiber_g: number; sugar_g: number; sodium_mg: number;
  estimated: boolean; missing: string[];
};

const NUTRIENT_KEYS = ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"] as const;

function emptyTotals(): NutritionTotals {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, estimated: false, missing: [] };
}

/** Compute totals for a recipe from its ingredients + food refs. */
export function computeRecipeNutrition(ingredients: RecipeIngredient[], foodsById: Map<string, Food>): NutritionTotals {
  const t = emptyTotals();
  for (const ing of ingredients) {
    const food = ing.food_id ? foodsById.get(ing.food_id) : undefined;
    if (!food || !food.serving_size || !food.serving_unit) {
      t.estimated = true;
      t.missing.push(ing.name_override || food?.name || "unknown ingredient");
      continue;
    }
    // Convert ingredient quantity to grams; convert food serving to grams.
    const ingG = toGrams(Number(ing.quantity), ing.unit, {
      gramsPerServing: food.grams_per_serving ? Number(food.grams_per_serving) : null,
      densityGPerMl: food.density_g_per_ml ? Number(food.density_g_per_ml) : null,
    });
    const servingG = toGrams(Number(food.serving_size), food.serving_unit, {
      gramsPerServing: food.grams_per_serving ? Number(food.grams_per_serving) : null,
      densityGPerMl: food.density_g_per_ml ? Number(food.density_g_per_ml) : null,
    });
    if (!ingG.grams || !servingG.grams) {
      t.estimated = true;
      t.missing.push(food.name);
      continue;
    }
    if (ingG.estimated || servingG.estimated) t.estimated = true;
    const factor = ingG.grams / servingG.grams;
    for (const k of NUTRIENT_KEYS) {
      const v = (food as any)[k];
      if (v != null) (t as any)[k] += Number(v) * factor;
    }
  }
  for (const k of NUTRIENT_KEYS) (t as any)[k] = Math.round((t as any)[k] * 10) / 10;
  return t;
}

export function perServing(totals: NutritionTotals, servings: number): NutritionTotals {
  const s = Math.max(1, Number(servings) || 1);
  const out: NutritionTotals = { ...totals, missing: [...totals.missing] };
  for (const k of NUTRIENT_KEYS) (out as any)[k] = Math.round(((totals as any)[k] / s) * 10) / 10;
  return out;
}

