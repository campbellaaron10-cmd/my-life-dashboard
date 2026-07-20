import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, Utensils, Loader2, Check } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { FoodTabs } from "@/components/atlas/FoodTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFoods, useUpsertFood, useDeleteFood, type Food } from "@/lib/atlas-data";
import { searchUsdaFoods, getUsdaFood, type UsdaSearchHit, type UsdaFoodNormalized } from "@/lib/usda.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/foods")({
  head: () => ({ meta: [{ title: "Foods — Atlas" }] }),
  component: FoodsPage,
});

function FoodsPage() {
  const [search, setSearch] = useState("");
  const foods = useFoods(search);
  const [manual, setManual] = useState<Partial<Food> | null>(null);
  const [usdaQuery, setUsdaQuery] = useState("");
  const [hits, setHits] = useState<UsdaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const usdaSearch = useServerFn(searchUsdaFoods);
  const usdaGet = useServerFn(getUsdaFood);
  const upsert = useUpsertFood();

  async function runUsda(e?: React.FormEvent) {
    e?.preventDefault();
    if (!usdaQuery.trim()) return;
    setSearching(true);
    try {
      const r = await usdaSearch({ data: { query: usdaQuery } });
      setHits(r.hits);
      if (!r.hits.length) toast.info("No USDA results — try a broader term.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function importHit(h: UsdaSearchHit, edit = false) {
    setImportingId(h.fdcId);
    try {
      const d: UsdaFoodNormalized = await usdaGet({ data: { fdcId: h.fdcId } });
      const draft: Partial<Food> = {
        name: d.name,
        brand: d.brand ?? null,
        source: "usda",
        external_id: String(d.fdcId),
        usda_data_type: d.dataType ?? null,
        nutrient_basis: d.nutrient_basis,
        n_calories: d.n_calories ?? null,
        n_protein_g: d.n_protein_g ?? null,
        n_carbs_g: d.n_carbs_g ?? null,
        n_fat_g: d.n_fat_g ?? null,
        n_fiber_g: d.n_fiber_g ?? null,
        n_sugar_g: d.n_sugar_g ?? null,
        n_sodium_mg: d.n_sodium_mg ?? null,
        serving_size: d.serving_size ?? null,
        serving_unit: d.serving_unit ?? null,
        grams_per_serving: d.grams_per_serving ?? null,
        household_measures: d.household_measures as any,
      };
      if (edit) {
        setManual(draft);
      } else {
        await upsert.mutateAsync(draft as any);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <FoodTabs />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Nutrition Library</p>
          <h1 className="text-4xl font-bold tracking-tight">Food Library</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every food you've saved — review nutrition, fix bad matches, or add a manual entry. You don't need to visit this page to add pantry items; USDA search is built into Add Pantry Item.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setManual({ source: "manual", nutrient_basis: "per_100g", serving_unit: "serving", household_measures: [] as any })}>
          <Plus className="mr-1 size-4" /> Manual entry
        </Button>
      </header>

      {/* USDA search: primary entry point */}
      <GlassCard>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">USDA FoodData Central</p>
        <form onSubmit={runUsda} className="flex gap-2">
          <Input
            placeholder="Search USDA — e.g. 2% milk, rolled oats, banana"
            value={usdaQuery}
            onChange={(e) => setUsdaQuery(e.target.value)}
            className="text-base"
          />
          <Button type="submit" disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <><Search className="mr-1 size-4" /> Search</>}
          </Button>
        </form>
        {hits.length > 0 && (
          <div className="mt-4 space-y-1">
            {hits.map((h) => (
              <div key={h.fdcId} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{h.description}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[h.brandOwner || h.brandName, h.dataType, h.servingSize ? `${h.servingSize} ${h.servingSizeUnit}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button size="sm" variant="ghost" disabled={importingId === h.fdcId} onClick={() => importHit(h, true)}>Preview</Button>
                <Button size="sm" disabled={importingId === h.fdcId} onClick={() => importHit(h, false)}>
                  {importingId === h.fdcId ? <Loader2 className="size-4 animate-spin" /> : <><Check className="mr-1 size-4" /> Import</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Saved library */}
      <GlassCard>
        <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-4">
          <Search className="size-4 text-muted-foreground" />
          <Input placeholder="Search saved foods…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {foods.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (foods.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Utensils className="size-10 opacity-40" />
            <p>No foods yet. Search USDA above to import your first one.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(foods.data ?? []).map((f) => {
              const basis = f.nutrient_basis === "per_100ml" ? "100 ml" : "100 g";
              return (
                <button
                  key={f.id}
                  onClick={() => setManual(f)}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:scale-[1.01] hover:bg-white/10"
                >
                  <p className="font-medium">{f.name}</p>
                  {f.brand && <p className="text-xs text-muted-foreground">{f.brand}</p>}
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    per {basis} · {f.n_calories ?? "?"} kcal · {f.source}
                  </p>
                  <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                    <span>P {f.n_protein_g ?? "–"}g</span>
                    <span>C {f.n_carbs_g ?? "–"}g</span>
                    <span>F {f.n_fat_g ?? "–"}g</span>
                  </div>
                  {Array.isArray(f.household_measures) && (f.household_measures as any[]).length > 0 && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {(f.household_measures as any[]).length} household measure{(f.household_measures as any[]).length > 1 ? "s" : ""}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      <FoodDialog open={manual !== null} initial={manual} onClose={() => setManual(null)} />
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FoodDialog({ open, initial, onClose }: { open: boolean; initial: Partial<Food> | null; onClose: () => void }) {
  const upsert = useUpsertFood();
  const del = useDeleteFood();
  const [form, setForm] = useState<Partial<Food>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);

  const num = (name: keyof Food) => {
    const v = (form as any)[name];
    return v == null ? "" : String(v);
  };
  const setNum = (name: keyof Food, v: string) => {
    setForm({ ...form, [name]: v === "" ? null : Number(v) } as any);
  };
  const measures = (Array.isArray(form.household_measures) ? form.household_measures : []) as any[];

  const basisLabel = form.nutrient_basis === "per_100ml" ? "per 100 ml" : "per 100 g";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Food" : initial?.external_id ? "Import from USDA" : "New Food"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Brand"><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value || null })} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nutrient basis" hint="Solids per 100 g. Liquids per 100 ml if you have that data.">
              <select
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.nutrient_basis ?? "per_100g"}
                onChange={(e) => setForm({ ...form, nutrient_basis: e.target.value })}
              >
                <option value="per_100g">per 100 g (mass)</option>
                <option value="per_100ml">per 100 ml (volume)</option>
              </select>
            </Field>
            <Field label="Density g/ml" hint="Needed to convert between weight and volume.">
              <Input type="number" step="0.001" value={num("density_g_per_ml")} onChange={(e) => setNum("density_g_per_ml", e.target.value)} />
            </Field>
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Nutrition ({basisLabel})</p>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Calories"><Input type="number" value={num("n_calories")} onChange={(e) => setNum("n_calories", e.target.value)} /></Field>
              <Field label="Protein g"><Input type="number" step="0.1" value={num("n_protein_g")} onChange={(e) => setNum("n_protein_g", e.target.value)} /></Field>
              <Field label="Carbs g"><Input type="number" step="0.1" value={num("n_carbs_g")} onChange={(e) => setNum("n_carbs_g", e.target.value)} /></Field>
              <Field label="Fat g"><Input type="number" step="0.1" value={num("n_fat_g")} onChange={(e) => setNum("n_fat_g", e.target.value)} /></Field>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Field label="Fiber g"><Input type="number" step="0.1" value={num("n_fiber_g")} onChange={(e) => setNum("n_fiber_g", e.target.value)} /></Field>
              <Field label="Sugar g"><Input type="number" step="0.1" value={num("n_sugar_g")} onChange={(e) => setNum("n_sugar_g", e.target.value)} /></Field>
              <Field label="Sodium mg"><Input type="number" step="1" value={num("n_sodium_mg")} onChange={(e) => setNum("n_sodium_mg", e.target.value)} /></Field>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Household measures</p>
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, household_measures: [...measures, { unit: "cup", amount: 1, gramWeight: 0, label: "1 cup" }] as any })}>
                <Plus className="mr-1 size-3" /> Add
              </Button>
            </div>
            {measures.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">e.g. 1 cup = 240 g. USDA imports auto-fill these.</p>
            ) : (
              <div className="space-y-2">
                {measures.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_1fr_90px_auto] items-center gap-2">
                    <Input placeholder="unit (cup, tbsp, egg…)" value={m.unit} onChange={(e) => {
                      const next = [...measures]; next[i] = { ...m, unit: e.target.value };
                      setForm({ ...form, household_measures: next as any });
                    }} />
                    <Input type="number" step="0.1" value={m.amount} onChange={(e) => {
                      const next = [...measures]; next[i] = { ...m, amount: Number(e.target.value) };
                      setForm({ ...form, household_measures: next as any });
                    }} />
                    <Input placeholder="label (1 cup)" value={m.label ?? ""} onChange={(e) => {
                      const next = [...measures]; next[i] = { ...m, label: e.target.value };
                      setForm({ ...form, household_measures: next as any });
                    }} />
                    <Input type="number" step="0.1" placeholder="grams" value={m.gramWeight ?? ""} onChange={(e) => {
                      const next = [...measures]; next[i] = { ...m, gramWeight: Number(e.target.value) };
                      setForm({ ...form, household_measures: next as any });
                    }} />
                    <button className="p-2 text-muted-foreground hover:text-warning" onClick={() => {
                      setForm({ ...form, household_measures: measures.filter((_, j) => j !== i) as any });
                    }}>
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Barcode"><Input value={form.barcode ?? ""} onChange={(e) => setForm({ ...form, barcode: e.target.value || null })} /></Field>
            <Field label="USDA data type"><Input value={form.usda_data_type ?? ""} onChange={(e) => setForm({ ...form, usda_data_type: e.target.value || null })} /></Field>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && (
            <Button variant="destructive" onClick={() => { if (confirm("Delete food?")) { del.mutate(initial.id!); onClose(); } }}>
              <Trash2 className="mr-1 size-4" /> Delete
            </Button>
          )}
          <Button onClick={async () => {
            if (!form.name) { toast.error("Name required"); return; }
            await upsert.mutateAsync(form as any);
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
