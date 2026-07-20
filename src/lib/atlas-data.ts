// Central query keys + hooks for all Atlas modules.
// All CRUD runs through the browser Supabase client; RLS scopes rows to auth.uid().
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { toGrams, toMl, findMeasure, normalizeUnit, unitKind, type HouseholdMeasure } from "./units";

type Tables = Database["public"]["Tables"];

export type Account = Tables["accounts"]["Row"];
export type Transaction = Tables["transactions"]["Row"];
export type BudgetCategory = Tables["budget_categories"]["Row"];
export type PantryItem = Tables["pantry_items"]["Row"];
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
        .from("accounts").select("*").eq("is_archived", false)
        .order("sort_order").order("created_at");
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
      const { data, error } = await supabase.from("accounts").upsert({ ...input, user_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.accounts }); toast.success("Account saved"); },
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
      const { data, error } = await supabase.from("transactions").upsert({ ...input, user_id }).select().single();
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
        .from("budget_categories").select("*").eq("is_archived", false).order("sort_order");
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.budgets }); toast.success("Budget saved"); },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.budgets }); toast.success("Budget removed"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Pantry ----------
export function usePantry(opts?: UseQueryOptions<PantryItem[]>) {
  return useQuery<PantryItem[]>({
    queryKey: qk.pantry,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items").select("*").eq("is_consumed", false)
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.pantry }); toast.success("Pantry updated"); },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.pantry }); toast.success("Item removed"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Tasks ----------
export function useTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*")
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
      const patch: any = { ...input, user_id };
      if (patch.is_done && !patch.completed_at) patch.completed_at = new Date().toISOString();
      if (patch.is_done === false) patch.completed_at = null;
      const { data, error } = await supabase.from("tasks").upsert(patch).select().single();
      if (error) throw error;
      return data as Task;
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
  const delta = txns.filter((t) => t.account_id === account.id).reduce((sum, t) => {
    if (t.type === "income") return sum + Number(t.amount);
    if (t.type === "expense") return sum - Number(t.amount);
    return sum;
  }, 0);
  return Number(account.starting_balance) + delta;
}

export function budgetSpent(cat: BudgetCategory, txns: Transaction[]): number {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  return txns
    .filter((t) => t.category_id === cat.id && t.type === "expense" && new Date(t.occurred_on) >= start)
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// ---------- Foods ----------
export function useFoods(search?: string) {
  return useQuery({
    queryKey: [...qk.foods, search ?? ""] as const,
    queryFn: async () => {
      let q = supabase.from("foods").select("*").eq("is_archived", false).order("name").limit(500);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.foods }); toast.success("Food saved"); },
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

/**
 * Find-or-create a Food from a normalized USDA payload.
 * Dedupes on (user_id, source='usda', external_id=fdcId).
 * Returns the Food row (existing or newly inserted).
 */
export function useImportUsdaFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fdcId: number;
      name: string;
      brand?: string | null;
      dataType?: string | null;
      nutrient_basis: "per_100g" | "per_100ml";
      n_calories?: number | null;
      n_protein_g?: number | null;
      n_carbs_g?: number | null;
      n_fat_g?: number | null;
      n_fiber_g?: number | null;
      n_sugar_g?: number | null;
      n_sodium_mg?: number | null;
      serving_size?: number | null;
      serving_unit?: string | null;
      grams_per_serving?: number | null;
      household_measures: HouseholdMeasure[];
    }) => {
      const user_id = await currentUserId();
      const fdcStr = String(payload.fdcId);
      const existing = await supabase
        .from("foods").select("*")
        .eq("user_id", user_id).eq("source", "usda").eq("external_id", fdcStr)
        .maybeSingle();
      if (existing.data) return existing.data as Food;
      const insert = await supabase.from("foods").insert({
        user_id,
        name: payload.name,
        brand: payload.brand ?? null,
        source: "usda",
        external_id: fdcStr,
        usda_data_type: payload.dataType ?? null,
        nutrient_basis: payload.nutrient_basis,
        n_calories: payload.n_calories ?? null,
        n_protein_g: payload.n_protein_g ?? null,
        n_carbs_g: payload.n_carbs_g ?? null,
        n_fat_g: payload.n_fat_g ?? null,
        n_fiber_g: payload.n_fiber_g ?? null,
        n_sugar_g: payload.n_sugar_g ?? null,
        n_sodium_mg: payload.n_sodium_mg ?? null,
        serving_size: payload.serving_size ?? null,
        serving_unit: payload.serving_unit ?? null,
        grams_per_serving: payload.grams_per_serving ?? null,
        household_measures: payload.household_measures as any,
      }).select().single();
      if (insert.error) throw insert.error;
      return insert.data as Food;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.recipes }); toast.success("Recipe removed"); },
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
        .from("recipe_ingredients").select("*").eq("recipe_id", recipeId!).order("sort_order");
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

// ---------- Nutrition math (normalized per 100 g/ml) ----------
export type NutritionTotals = {
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  fiber_g: number; sugar_g: number; sodium_mg: number;
  estimated: boolean; missing: string[];
};

const N_KEYS = [
  ["calories", "n_calories"],
  ["protein_g", "n_protein_g"],
  ["carbs_g", "n_carbs_g"],
  ["fat_g", "n_fat_g"],
  ["fiber_g", "n_fiber_g"],
  ["sugar_g", "n_sugar_g"],
  ["sodium_mg", "n_sodium_mg"],
] as const;

function emptyTotals(): NutritionTotals {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, estimated: false, missing: [] };
}

function measures(food: Food): HouseholdMeasure[] {
  return Array.isArray(food.household_measures) ? (food.household_measures as unknown as HouseholdMeasure[]) : [];
}

/** Convert an ingredient quantity to grams (or ml) matching the food's basis. */
export function resolveAmountInBasis(
  food: Food,
  qty: number,
  unit: string | null | undefined,
): { amount: number | null; estimated: boolean; reason?: string } {
  const density = food.density_g_per_ml ? Number(food.density_g_per_ml) : null;
  const gramsPerServing = food.grams_per_serving ? Number(food.grams_per_serving) : null;
  const basis = food.nutrient_basis === "per_100ml" ? "ml" : "g";

  // 1. Try USDA household measure lookup first (best accuracy for count/cup/tbsp/etc).
  const hm = findMeasure(measures(food), unit);
  if (hm) {
    const grams = qty * (hm.gramWeight / (hm.amount || 1));
    if (basis === "g") return { amount: grams, estimated: false };
    if (density) return { amount: grams / density, estimated: false };
    return { amount: grams, estimated: true, reason: "density unknown; assumed 1 g/ml" };
  }

  // 2. Standard unit conversion.
  if (basis === "g") {
    const r = toGrams(qty, unit, { gramsPerServing, densityGPerMl: density });
    return { amount: r.grams, estimated: r.estimated, reason: r.reason };
  } else {
    const r = toMl(qty, unit, { densityGPerMl: density });
    return { amount: r.ml, estimated: r.estimated, reason: r.reason };
  }
}

/** Compute totals for a recipe from its ingredients + food refs. */
export function computeRecipeNutrition(ingredients: RecipeIngredient[], foodsById: Map<string, Food>): NutritionTotals {
  const t = emptyTotals();
  for (const ing of ingredients) {
    const food = ing.food_id ? foodsById.get(ing.food_id) : undefined;
    if (!food) {
      t.estimated = true;
      t.missing.push(ing.name_override || "unknown ingredient");
      continue;
    }
    const r = resolveAmountInBasis(food, Number(ing.quantity), ing.unit);
    if (r.amount == null) {
      t.estimated = true;
      t.missing.push(food.name);
      continue;
    }
    if (r.estimated) t.estimated = true;
    const factor = r.amount / 100; // n_* values are per 100 units of basis
    for (const [outKey, srcKey] of N_KEYS) {
      const v = (food as any)[srcKey];
      if (v != null) (t as any)[outKey] += Number(v) * factor;
    }
  }
  for (const [k] of N_KEYS) (t as any)[k] = Math.round((t as any)[k] * 10) / 10;
  return t;
}

export function perServing(totals: NutritionTotals, servings: number): NutritionTotals {
  const s = Math.max(1, Number(servings) || 1);
  const out: NutritionTotals = { ...totals, missing: [...totals.missing] };
  for (const [k] of N_KEYS) (out as any)[k] = Math.round(((totals as any)[k] / s) * 10) / 10;
  return out;
}

// ---------- Pantry availability for recipes ----------
/**
 * Given a recipe's ingredients and current pantry inventory, compute what
 * fraction of the recipe can be made. Returns 0-1 (min across ingredients).
 * Ingredients without a linked food or an unknown unit are ignored (skipped).
 */
export function computePantryCoverage(
  ingredients: RecipeIngredient[],
  pantry: PantryItem[],
  foodsById: Map<string, Food>,
): { coverage: number; perIngredient: { ingredient: RecipeIngredient; need: number | null; have: number; ratio: number; estimated: boolean }[] } {
  const per: { ingredient: RecipeIngredient; need: number | null; have: number; ratio: number; estimated: boolean }[] = [];
  let minRatio = 1;
  let counted = 0;

  for (const ing of ingredients) {
    if (!ing.food_id) { per.push({ ingredient: ing, need: null, have: 0, ratio: 1, estimated: true }); continue; }
    const food = foodsById.get(ing.food_id);
    if (!food) { per.push({ ingredient: ing, need: null, have: 0, ratio: 1, estimated: true }); continue; }
    const need = resolveAmountInBasis(food, Number(ing.quantity), ing.unit);
    if (need.amount == null) { per.push({ ingredient: ing, need: null, have: 0, ratio: 1, estimated: true }); continue; }

    // Sum pantry stocks of this food, converted to the food's basis.
    let have = 0;
    let est = need.estimated;
    for (const p of pantry.filter((x) => x.food_id === food.id)) {
      const h = resolveAmountInBasis(food, Number(p.quantity), p.unit);
      if (h.amount != null) have += h.amount;
      if (h.estimated) est = true;
    }
    const ratio = need.amount === 0 ? 1 : Math.min(1, have / need.amount);
    per.push({ ingredient: ing, need: need.amount, have, ratio, estimated: est });
    minRatio = Math.min(minRatio, ratio);
    counted++;
  }

  return { coverage: counted ? minRatio : 0, perIngredient: per };
}

// Small helper for UI unit hints.
export function describeUnitKind(u: string | null | undefined): string {
  const k = unitKind(u);
  if (k === "mass") return "weight";
  if (k === "volume") return "volume";
  if (k === "count") return "count";
  return "unknown";
}
export { normalizeUnit };
