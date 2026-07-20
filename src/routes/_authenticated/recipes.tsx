import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChefHat, ArrowLeft, GripVertical, Search, ShoppingBag, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { FoodTabs } from "@/components/atlas/FoodTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useRecipes, useUpsertRecipe, useDeleteRecipe, useRecipe,
  useRecipeIngredients, useUpsertIngredient, useDeleteIngredient,
  useFoods, usePantry, useUpsertTask, useImportUsdaFood,
  computeRecipeNutrition, perServing, computePantryCoverage,
  type Recipe, type RecipeIngredient, type Food,
} from "@/lib/atlas-data";
import { searchUsdaFoods, getUsdaFood, type UsdaSearchHit } from "@/lib/usda.functions";

import { UNIT_OPTIONS, findMeasure } from "@/lib/units";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recipes")({
  head: () => ({ meta: [{ title: "Recipes — Atlas" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || undefined }),
  component: RecipesPage,
});

function RecipesPage() {
  const { id } = Route.useSearch();
  if (id) return <RecipeDetail id={id} />;
  return <RecipeList />;
}

function RecipeList() {
  const recipes = useRecipes();
  const [dialog, setDialog] = useState<Partial<Recipe> | null>(null);

  return (
    <div className="space-y-8">
      <FoodTabs />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Cookbook</p>
          <h1 className="text-4xl font-bold tracking-tight">Recipes</h1>
        </div>
        <Button onClick={() => setDialog({ servings: 4 })}><Plus className="mr-1 size-4" /> Recipe</Button>
      </header>

      <GlassCard>
        {recipes.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (recipes.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <ChefHat className="size-10 opacity-40" />
            <p>No recipes yet. Build one from your foods library.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(recipes.data ?? []).map((r) => (
              <Link
                key={r.id}
                to="/recipes"
                search={{ id: r.id }}
                className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:scale-[1.01] hover:bg-white/10"
              >
                <p className="font-medium">{r.title}</p>
                {r.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {r.servings} servings · {(r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)} min
                </p>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>

      <RecipeDialog open={dialog !== null} initial={dialog} onClose={() => setDialog(null)} onSaved={() => setDialog(null)} />
    </div>
  );
}

function RecipeDetail({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const ingredients = useRecipeIngredients(id);
  const foods = useFoods();
  const pantry = usePantry();
  const upsertIng = useUpsertIngredient();
  const delIng = useDeleteIngredient();
  const delRecipe = useDeleteRecipe();
  const upsertTask = useUpsertTask();
  const [editRecipe, setEditRecipe] = useState<Partial<Recipe> | null>(null);
  const [editIng, setEditIng] = useState<Partial<RecipeIngredient> | null>(null);

  const foodsById = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of foods.data ?? []) m.set(f.id, f);
    return m;
  }, [foods.data]);

  const totals = useMemo(
    () => computeRecipeNutrition(ingredients.data ?? [], foodsById),
    [ingredients.data, foodsById],
  );
  const per = useMemo(() => perServing(totals, Number(recipe.data?.servings ?? 1)), [totals, recipe.data?.servings]);
  const coverage = useMemo(
    () => computePantryCoverage(ingredients.data ?? [], pantry.data ?? [], foodsById),
    [ingredients.data, pantry.data, foodsById],
  );

  async function generateShoppingTasks() {
    const missing = coverage.perIngredient.filter((p) => p.ratio < 1 && p.ingredient.food_id);
    if (!missing.length) { toast.info("Pantry has everything for this recipe."); return; }
    await Promise.all(missing.map((m) => {
      const food = foodsById.get(m.ingredient.food_id!);
      const title = `Buy ${food?.name ?? m.ingredient.name_override ?? "ingredient"}`;
      return upsertTask.mutateAsync({
        title,
        kind: "shopping",
        food_id: m.ingredient.food_id,
        quantity: Number(m.ingredient.quantity),
        unit: m.ingredient.unit,
        priority: "normal",
      });
    }));
    toast.success(`Added ${missing.length} shopping task${missing.length > 1 ? "s" : ""}`);
  }

  if (recipe.isLoading || !recipe.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const r = recipe.data;
  const coveragePct = Math.round(coverage.coverage * 100);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/recipes" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> All recipes
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">{r.title}</h1>
          {r.description && <p className="mt-2 max-w-2xl text-muted-foreground">{r.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditRecipe(r)}>Edit</Button>
          <Button variant="destructive" onClick={() => { if (confirm("Delete recipe?")) { delRecipe.mutate(r.id); history.back(); } }}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Pantry coverage banner */}
      <GlassCard className="border border-primary/20">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Pantry availability</p>
            <p className="mt-1 text-2xl font-semibold">{coveragePct}% ready</p>
            <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/5">
              <div className={`h-full transition-all ${coveragePct >= 100 ? "bg-success" : "bg-primary"}`} style={{ width: `${coveragePct}%` }} />
            </div>
          </div>
          {coveragePct < 100 && (
            <Button variant="secondary" onClick={generateShoppingTasks}>
              <ShoppingBag className="mr-1 size-4" /> Add missing to shopping
            </Button>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <Button size="sm" onClick={() => setEditIng({ recipe_id: r.id, quantity: 1, sort_order: (ingredients.data?.length ?? 0) })}>
              <Plus className="mr-1 size-4" /> Add
            </Button>
          </div>
          {(ingredients.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No ingredients yet.</p>
          ) : (
            <div className="space-y-1">
              {(ingredients.data ?? []).map((ing) => {
                const food = ing.food_id ? foodsById.get(ing.food_id) : undefined;
                const cov = coverage.perIngredient.find((c) => c.ingredient.id === ing.id);
                const ratioPct = cov ? Math.round(cov.ratio * 100) : 0;
                return (
                  <button
                    key={ing.id}
                    onClick={() => setEditIng(ing)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:border-white/10 hover:bg-white/5"
                  >
                    <GripVertical className="size-4 text-muted-foreground opacity-40" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{food?.name || ing.name_override || "—"}</p>
                      {food?.brand && <p className="text-[11px] text-muted-foreground">{food.brand}</p>}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{ing.quantity} {ing.unit ?? ""}</span>
                    {ing.food_id && (
                      <span className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] ${ratioPct >= 100 ? "bg-success/20 text-success" : ratioPct > 0 ? "bg-warning/20 text-warning" : "bg-white/5 text-muted-foreground"}`}>
                        {ratioPct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {r.instructions && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Instructions</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.instructions}</p>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold">Nutrition</h2>
          {totals.estimated && (
            <p className="mb-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
              Estimated — {totals.missing.length ? `imprecise for: ${totals.missing.slice(0, 3).join(", ")}${totals.missing.length > 3 ? "…" : ""}` : "unit conversions approximate"}
            </p>
          )}
          <NutritionBlock label={`Per serving (${r.servings})`} n={per} />
          <div className="mt-4 border-t border-white/5 pt-4">
            <NutritionBlock label="Total recipe" n={totals} muted />
          </div>
        </GlassCard>
      </div>

      <RecipeDialog open={editRecipe !== null} initial={editRecipe} onClose={() => setEditRecipe(null)} onSaved={() => setEditRecipe(null)} />
      <IngredientDialog
        open={editIng !== null}
        initial={editIng}
        recipeId={r.id}
        foods={foods.data ?? []}
        onClose={() => setEditIng(null)}
        onSave={async (v) => { await upsertIng.mutateAsync({ ...v, recipe_id: r.id }); setEditIng(null); }}
        onDelete={async (v) => { await delIng.mutateAsync(v as RecipeIngredient); setEditIng(null); }}
      />
    </div>
  );
}

function NutritionBlock({ label, n, muted }: { label: string; n: ReturnType<typeof perServing>; muted?: boolean }) {
  const rows: [string, string][] = [
    ["Calories", `${n.calories} kcal`],
    ["Protein", `${n.protein_g} g`],
    ["Carbs", `${n.carbs_g} g`],
    ["Fat", `${n.fat_g} g`],
    ["Fiber", `${n.fiber_g} g`],
    ["Sugar", `${n.sugar_g} g`],
    ["Sodium", `${n.sodium_mg} mg`],
  ];
  return (
    <div>
      <p className={`mb-2 font-mono text-[10px] uppercase tracking-widest ${muted ? "text-muted-foreground" : "text-primary"}`}>{label}</p>
      <div className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function RecipeDialog({ open, initial, onClose, onSaved }: { open: boolean; initial: Partial<Recipe> | null; onClose: () => void; onSaved: () => void }) {
  const upsert = useUpsertRecipe();
  const [form, setForm] = useState<Partial<Recipe>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Recipe" : "New Recipe"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Servings"><Input type="number" step="0.5" value={form.servings ?? 1} onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })} /></Field>
            <Field label="Prep min"><Input type="number" value={form.prep_minutes ?? ""} onChange={(e) => setForm({ ...form, prep_minutes: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Cook min"><Input type="number" value={form.cook_minutes ?? ""} onChange={(e) => setForm({ ...form, cook_minutes: e.target.value ? Number(e.target.value) : null })} /></Field>
          </div>
          <Field label="Instructions"><Textarea rows={8} value={form.instructions ?? ""} onChange={(e) => setForm({ ...form, instructions: e.target.value || null })} /></Field>
          <Field label="Source URL"><Input value={form.source_url ?? ""} onChange={(e) => setForm({ ...form, source_url: e.target.value || null })} /></Field>
        </div>
        <DialogFooter>
          <Button onClick={async () => { if (!form.title) { toast.error("Title required"); return; } await upsert.mutateAsync(form as any); onSaved(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IngredientDialog({ open, initial, recipeId, foods, onClose, onSave, onDelete }: {
  open: boolean;
  initial: Partial<RecipeIngredient> | null;
  recipeId: string;
  foods: Food[];
  onClose: () => void;
  onSave: (v: Partial<RecipeIngredient>) => void | Promise<void>;
  onDelete: (v: Partial<RecipeIngredient>) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<RecipeIngredient>>({});
  const [foodQuery, setFoodQuery] = useState("");
  useEffect(() => { setForm(initial ?? { recipe_id: recipeId }); setFoodQuery(""); }, [initial, recipeId]);

  const linkedFood = form.food_id ? foods.find((f) => f.id === form.food_id) : undefined;
  const matches = foodQuery ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.toLowerCase())).slice(0, 8) : [];

  // Merge household-measure units from the linked food into unit dropdown.
  const foodMeasures = (linkedFood?.household_measures as any[] | null) ?? [];
  const measureUnits = Array.from(new Set(foodMeasures.map((m: any) => String(m.unit)).filter(Boolean)));
  const currentMeasure = linkedFood && form.unit ? findMeasure(foodMeasures as any, form.unit) : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Food">
            {linkedFood ? (
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{linkedFood.name}</p>
                  {linkedFood.brand && <p className="text-[11px] text-muted-foreground">{linkedFood.brand}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, food_id: null })}>Change</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Search className="size-4 text-muted-foreground" />
                  <Input placeholder="Search saved foods…" value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} />
                </div>
                {matches.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-white/5 bg-white/5">
                    {matches.map((f) => (
                      <button key={f.id} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/10"
                        onClick={() => { setForm({ ...form, food_id: f.id }); setFoodQuery(""); }}>
                        <span className="text-sm">{f.name}</span>
                        {f.brand && <span className="text-[10px] text-muted-foreground">{f.brand}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <Field label="Or free-text name">
                    <Input value={form.name_override ?? ""} onChange={(e) => setForm({ ...form, name_override: e.target.value || null })} />
                  </Field>
                </div>
              </>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><Input type="number" step="0.01" value={form.quantity ?? 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
            <Field label="Unit">
              <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value || null })}>
                <option value="">unit</option>
                {measureUnits.length > 0 && (
                  <optgroup label="From this food">
                    {measureUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </optgroup>
                )}
                <optgroup label="Standard">
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </optgroup>
              </select>
            </Field>
          </div>
          {currentMeasure && (
            <p className="text-[11px] text-muted-foreground">
              Using USDA measure: {currentMeasure.amount} {currentMeasure.unit} ≈ {currentMeasure.gramWeight} g
            </p>
          )}
          <Field label="Note"><Input value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value || null })} /></Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && (
            <Button variant="destructive" onClick={() => onDelete(initial)}>
              <Trash2 className="mr-1 size-4" /> Remove
            </Button>
          )}
          <Button onClick={() => onSave({ ...form, recipe_id: recipeId })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
