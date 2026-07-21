import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, ChefHat, ArrowLeft, GripVertical, Search, ShoppingBag, Loader2,
  Sparkles, Flame, AlarmClock, Coffee, UtensilsCrossed, Soup, Cookie, Wine,
  Martini, Zap, Package, X,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { GlassCard } from "@/components/atlas/GlassCard";
import { FoodTabs } from "@/components/atlas/FoodTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  useRecipes, useUpsertRecipe, useDeleteRecipe, useRecipe,
  useRecipeIngredients, useUpsertIngredient, useDeleteIngredient, useReorderIngredients,
  useAllRecipeIngredients, useFoods, usePantry, useUpsertTask, useImportUsdaFood,
  computeRecipeNutrition, perServing, computePantryCoverage, daysUntil,
  type Recipe, type RecipeIngredient, type Food,
} from "@/lib/atlas-data";
import { searchUsdaFoods, getUsdaFood, type UsdaSearchHit } from "@/lib/usda.functions";
import { UNIT_OPTIONS, findMeasure } from "@/lib/units";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recipes")({
  head: () => ({ meta: [{ title: "Recipes — Atlas" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    id: (s.id as string) || undefined,
    tag: (s.tag as string) || undefined,
  }),
  component: RecipesPage,
});

// ---- Tag taxonomy ---------------------------------------------------------
type TagDef = { id: string; label: string; icon: typeof Coffee; accent: string };
const TAGS: TagDef[] = [
  { id: "breakfast", label: "Breakfast", icon: Coffee, accent: "from-amber-500/20 to-orange-500/5" },
  { id: "lunch",     label: "Lunch",     icon: UtensilsCrossed, accent: "from-emerald-500/20 to-teal-500/5" },
  { id: "dinner",    label: "Dinner",    icon: Soup, accent: "from-rose-500/20 to-red-500/5" },
  { id: "snacks",    label: "Snacks",    icon: Cookie, accent: "from-yellow-500/20 to-amber-500/5" },
  { id: "desserts",  label: "Desserts",  icon: Cookie, accent: "from-pink-500/20 to-fuchsia-500/5" },
  { id: "drinks",    label: "Drinks",    icon: Wine, accent: "from-sky-500/20 to-cyan-500/5" },
  { id: "alcoholic", label: "Alcoholic", icon: Martini, accent: "from-violet-500/20 to-purple-500/5" },
  { id: "air-fryer", label: "Air Fryer", icon: Flame, accent: "from-orange-500/20 to-red-500/5" },
  { id: "quick",     label: "Quick",     icon: Zap, accent: "from-lime-500/20 to-green-500/5" },
  { id: "meal-prep", label: "Meal Prep", icon: Package, accent: "from-indigo-500/20 to-blue-500/5" },
];
const TAGS_BY_ID = new Map(TAGS.map((t) => [t.id, t]));

function RecipesPage() {
  const { id, tag } = Route.useSearch();
  if (id) return <RecipeDetail id={id} />;
  return <RecipeList activeTag={tag} />;
}

// =============================================================================
// LIST VIEW
// =============================================================================
function RecipeList({ activeTag }: { activeTag?: string }) {
  const recipes = useRecipes();
  const foods = useFoods();
  const pantry = usePantry();
  const [dialog, setDialog] = useState<Partial<Recipe> | null>(null);

  const recipeIds = useMemo(() => (recipes.data ?? []).map((r) => r.id), [recipes.data]);
  const allIngs = useAllRecipeIngredients(recipeIds);

  const foodsById = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of foods.data ?? []) m.set(f.id, f);
    return m;
  }, [foods.data]);

  // Per-recipe coverage + earliest expiring ingredient day
  const scored = useMemo(() => {
    if (!recipes.data || !allIngs.data) return [];
    const byRecipe = new Map<string, RecipeIngredient[]>();
    for (const ing of allIngs.data) {
      const arr = byRecipe.get(ing.recipe_id) ?? [];
      arr.push(ing);
      byRecipe.set(ing.recipe_id, arr);
    }
    return recipes.data.map((r) => {
      const ings = byRecipe.get(r.id) ?? [];
      const cov = computePantryCoverage(ings, pantry.data ?? [], foodsById);
      // Earliest expiring pantry item that this recipe uses.
      let expiringSoon: number | null = null;
      for (const ing of ings) {
        if (!ing.food_id) continue;
        const stocks = (pantry.data ?? []).filter((p) => p.food_id === ing.food_id);
        for (const s of stocks) {
          const d = daysUntil(s.expires_on);
          if (d != null && d <= 7 && (expiringSoon == null || d < expiringSoon)) expiringSoon = d;
        }
      }
      return { recipe: r, coverage: cov.coverage, ingCount: ings.length, expiringSoon };
    });
  }, [recipes.data, allIngs.data, pantry.data, foodsById]);

  const expiringSoon = useMemo(
    () => scored.filter((s) => s.expiringSoon != null).sort((a, b) => (a.expiringSoon! - b.expiringSoon!)).slice(0, 6),
    [scored],
  );
  const highMatch = useMemo(
    () => scored.filter((s) => s.ingCount > 0 && s.coverage >= 0.6).sort((a, b) => b.coverage - a.coverage).slice(0, 6),
    [scored],
  );

  // Filtered feed when a tag is active
  const filtered = useMemo(() => {
    if (!activeTag) return [];
    return scored.filter((s) => (s.recipe.tags ?? []).includes(activeTag));
  }, [scored, activeTag]);

  return (
    <div className="space-y-8">
      <FoodTabs />

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Cookbook</p>
          <h1 className="truncate text-4xl font-bold tracking-tight">Recipes</h1>
        </div>
        <Button onClick={() => setDialog({ servings: 4, tags: [] })}>
          <Plus className="mr-1 size-4" /> Recipe
        </Button>
      </header>

      {recipes.isLoading ? (
        <GlassCard><p className="text-sm text-muted-foreground">Loading…</p></GlassCard>
      ) : (recipes.data ?? []).length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <ChefHat className="size-10 opacity-40" />
            <p>No recipes yet. Build one from your foods library.</p>
          </div>
        </GlassCard>
      ) : activeTag ? (
        <FilteredView tag={activeTag} rows={filtered} />
      ) : (
        <>
          <SuggestionRow
            title="Cook these soon"
            subtitle="Uses pantry items expiring within a week"
            icon={AlarmClock}
            accent="text-warning"
            rows={expiringSoon}
            emptyLabel="Nothing in your pantry is expiring soon."
          />
          <SuggestionRow
            title="Ready to make"
            subtitle="Recipes with the highest pantry match"
            icon={Sparkles}
            accent="text-primary"
            rows={highMatch}
            emptyLabel="Stock your pantry to unlock ready-to-make recipes."
          />

          {/* Tag grid */}
          <section>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Browse by category</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {TAGS.map((t) => {
                const count = scored.filter((s) => (s.recipe.tags ?? []).includes(t.id)).length;
                const Icon = t.icon;
                return (
                  <Link
                    key={t.id}
                    to="/recipes"
                    search={{ tag: t.id }}
                    className={cn(
                      "glass-panel group relative overflow-hidden rounded-2xl p-5 transition-all hover:scale-[1.02]",
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", t.accent)} />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <Icon className="mb-3 size-5 text-foreground/80" />
                        <p className="font-medium">{t.label}</p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {count} {count === 1 ? "recipe" : "recipes"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Full list */}
          <section>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">All recipes</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {scored.map((s) => <RecipeCard key={s.recipe.id} row={s} />)}
            </div>
          </section>
        </>
      )}

      <RecipeDialog open={dialog !== null} initial={dialog} onClose={() => setDialog(null)} onSaved={() => setDialog(null)} />
    </div>
  );
}

function SuggestionRow({
  title, subtitle, icon: Icon, accent, rows, emptyLabel,
}: {
  title: string; subtitle: string; icon: typeof Sparkles; accent: string;
  rows: { recipe: Recipe; coverage: number; ingCount: number; expiringSoon: number | null }[];
  emptyLabel: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("size-4", accent)} />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <GlassCard className="py-6"><p className="text-center text-sm text-muted-foreground">{emptyLabel}</p></GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => <RecipeCard key={s.recipe.id} row={s} />)}
        </div>
      )}
    </section>
  );
}

function FilteredView({ tag, rows }: {
  tag: string;
  rows: { recipe: Recipe; coverage: number; ingCount: number; expiringSoon: number | null }[];
}) {
  const def = TAGS_BY_ID.get(tag);
  const Icon = def?.icon ?? ChefHat;
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/recipes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> All categories
        </Link>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-white/5"><Icon className="size-5" /></div>
        <div>
          <h2 className="text-2xl font-bold">{def?.label ?? tag}</h2>
          <p className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "recipe" : "recipes"}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <GlassCard className="py-12"><p className="text-center text-sm text-muted-foreground">No recipes tagged “{def?.label ?? tag}” yet.</p></GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => <RecipeCard key={s.recipe.id} row={s} />)}
        </div>
      )}
    </section>
  );
}

function RecipeCard({ row }: { row: { recipe: Recipe; coverage: number; ingCount: number; expiringSoon: number | null } }) {
  const r = row.recipe;
  const covPct = Math.round(row.coverage * 100);
  return (
    <Link
      to="/recipes"
      search={{ id: r.id }}
      className="glass-panel group relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-[1.01]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{r.title}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {r.servings} servings · {(r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)} min
          </p>
        </div>
        {row.ingCount > 0 && (
          <span className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]",
            covPct >= 100 ? "bg-success/20 text-success"
              : covPct >= 60 ? "bg-primary/20 text-primary"
              : "bg-white/5 text-muted-foreground",
          )}>
            {covPct}%
          </span>
        )}
      </div>
      {row.expiringSoon != null && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 font-mono text-[10px] text-warning">
          <AlarmClock className="size-3" />
          {row.expiringSoon <= 0 ? "expires today" : `expires in ${row.expiringSoon}d`}
        </p>
      )}
      {(r.tags ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(r.tags ?? []).slice(0, 3).map((t) => {
            const d = TAGS_BY_ID.get(t);
            return (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                {d?.label ?? t}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
}

// =============================================================================
// DETAIL VIEW
// =============================================================================
function RecipeDetail({ id }: { id: string }) {
  const recipe = useRecipe(id);
  const ingredients = useRecipeIngredients(id);
  const foods = useFoods();
  const pantry = usePantry();
  const upsertIng = useUpsertIngredient();
  const delIng = useDeleteIngredient();
  const reorderIng = useReorderIngredients(id);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = ingredients.data ?? [];
    const oldIdx = list.findIndex((i) => i.id === active.id);
    const newIdx = list.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(list, oldIdx, newIdx);
    reorderIng.mutate(next.map((i) => i.id));
  }

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
  const list = ingredients.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/recipes" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> All recipes
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">{r.title}</h1>
          {r.description && <p className="mt-2 max-w-2xl text-muted-foreground">{r.description}</p>}
          {(r.tags ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(r.tags ?? []).map((t) => {
                const d = TAGS_BY_ID.get(t);
                return (
                  <span key={t} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary">
                    {d?.label ?? t}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditRecipe(r)}>Edit</Button>
          <Button variant="destructive" onClick={() => { if (confirm("Delete recipe?")) { delRecipe.mutate(r.id); history.back(); } }}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

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
            <Button size="sm" onClick={() => setEditIng({ recipe_id: r.id, quantity: 1, sort_order: list.length })}>
              <Plus className="mr-1 size-4" /> Add
            </Button>
          </div>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No ingredients yet.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {list.map((ing) => {
                    const food = ing.food_id ? foodsById.get(ing.food_id) : undefined;
                    const cov = coverage.perIngredient.find((c) => c.ingredient.id === ing.id);
                    const ratioPct = cov ? Math.round(cov.ratio * 100) : 0;
                    return (
                      <SortableIngredient
                        key={ing.id}
                        id={ing.id}
                        name={food?.name || ing.name_override || "—"}
                        brand={food?.brand}
                        qty={`${ing.quantity} ${ing.unit ?? ""}`}
                        ratioPct={ing.food_id ? ratioPct : null}
                        onClick={() => setEditIng(ing)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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

function SortableIngredient({ id, name, brand, qty, ratioPct, onClick }: {
  id: string; name: string; brand?: string | null; qty: string; ratioPct: number | null; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all",
        "hover:border-white/10 hover:bg-white/5",
        isDragging && "border-primary/40 bg-primary/5 shadow-lg",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="touch-none cursor-grab rounded p-0.5 text-muted-foreground opacity-60 hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {brand && <p className="truncate text-[11px] text-muted-foreground">{brand}</p>}
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{qty}</span>
        {ratioPct != null && (
          <span className={cn(
            "ml-2 shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]",
            ratioPct >= 100 ? "bg-success/20 text-success"
              : ratioPct > 0 ? "bg-warning/20 text-warning"
              : "bg-white/5 text-muted-foreground",
          )}>
            {ratioPct}%
          </span>
        )}
      </button>
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

// =============================================================================
// DIALOGS
// =============================================================================
function RecipeDialog({ open, initial, onClose, onSaved }: { open: boolean; initial: Partial<Recipe> | null; onClose: () => void; onSaved: () => void }) {
  const upsert = useUpsertRecipe();
  const [form, setForm] = useState<Partial<Recipe>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);

  const selectedTags = new Set(form.tags ?? []);
  function toggleTag(id: string) {
    const next = new Set(selectedTags);
    next.has(id) ? next.delete(id) : next.add(id);
    setForm({ ...form, tags: Array.from(next) });
  }

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
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const active = selectedTags.has(t.id);
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
                      active
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3" />
                    {t.label}
                    {active && <X className="size-3" />}
                  </button>
                );
              })}
            </div>
          </Field>
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
  const importUsda = useImportUsdaFood();
  const usdaSearch = useServerFn(searchUsdaFoods);
  const usdaGet = useServerFn(getUsdaFood);
  const [form, setForm] = useState<Partial<RecipeIngredient>>({});
  const [foodQuery, setFoodQuery] = useState("");
  const [hits, setHits] = useState<UsdaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  useEffect(() => {
    setForm(initial ?? { recipe_id: recipeId });
    setFoodQuery(""); setHits([]);
  }, [initial, recipeId]);

  const linkedFood = form.food_id ? foods.find((f) => f.id === form.food_id) : undefined;
  const matches = foodQuery ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.toLowerCase())).slice(0, 6) : [];

  const foodMeasures = (linkedFood?.household_measures as any[] | null) ?? [];
  const measureUnits = Array.from(new Set(foodMeasures.map((m: any) => String(m.unit)).filter(Boolean)));
  const currentMeasure = linkedFood && form.unit ? findMeasure(foodMeasures as any, form.unit) : undefined;

  async function runUsda(e?: React.FormEvent) {
    e?.preventDefault();
    if (!foodQuery.trim()) return;
    setSearching(true);
    try {
      const r = await usdaSearch({ data: { query: foodQuery, pageSize: 10 } });
      setHits(r.hits);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function pickUsda(hit: UsdaSearchHit) {
    setImportingId(hit.fdcId);
    try {
      const d = await usdaGet({ data: { fdcId: hit.fdcId } });
      const food = await importUsda.mutateAsync(d);
      setForm((f) => ({ ...f, food_id: food.id, name_override: null }));
      setHits([]); setFoodQuery("");
      toast.success(`Linked ${food.name}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImportingId(null);
    }
  }

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
                  <p className="text-[11px] text-muted-foreground">
                    {[linkedFood.brand, linkedFood.source === "usda" ? `USDA #${linkedFood.external_id}` : "manual"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, food_id: null })}>Change</Button>
              </div>
            ) : (
              <>
                <form onSubmit={runUsda} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search USDA or your library — e.g. olive oil"
                      value={foodQuery}
                      onChange={(e) => setFoodQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button type="submit" disabled={searching}>
                    {searching ? <Loader2 className="size-4 animate-spin" /> : "USDA"}
                  </Button>
                </form>
                {(matches.length > 0 || hits.length > 0) && (
                  <div className="mt-2 space-y-1 rounded-xl border border-white/5 bg-white/5 p-1">
                    {matches.map((f) => (
                      <button key={f.id}
                        onClick={() => { setForm({ ...form, food_id: f.id, name_override: null }); setFoodQuery(""); setHits([]); }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10">
                        <span className="text-sm">
                          <span className="font-medium">{f.name}</span>
                          {f.brand && <span className="text-muted-foreground"> · {f.brand}</span>}
                        </span>
                        <span className="font-mono text-[10px] text-primary/80">saved</span>
                      </button>
                    ))}
                    {hits.map((h) => (
                      <button key={h.fdcId} onClick={() => pickUsda(h)} disabled={importingId === h.fdcId}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10 disabled:opacity-50">
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-medium">{h.description}</span>
                          <span className="ml-1 text-[11px] text-muted-foreground">
                            {[h.brandOwner || h.brandName, h.dataType].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {importingId === h.fdcId
                          ? <Loader2 className="size-4 animate-spin" />
                          : <span className="font-mono text-[10px] text-muted-foreground">USDA</span>}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Picking a USDA result saves nutrition to your Food Library — reused automatically next time.
                </p>
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
              <Select value={form.unit ?? "__none"} onValueChange={(v) => setForm({ ...form, unit: v === "__none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">unit</SelectItem>
                  {measureUnits.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>From this food</SelectLabel>
                      {measureUnits.map((u) => <SelectItem key={`m-${u}`} value={u}>{u}</SelectItem>)}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    <SelectLabel>Standard</SelectLabel>
                    {UNIT_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
