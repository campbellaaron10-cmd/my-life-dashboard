import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, Wand2, Utensils, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFoods, useUpsertFood, useDeleteFood, type Food } from "@/lib/atlas-data";
import { searchUsdaFoods, getUsdaFood, type UsdaSearchHit } from "@/lib/usda.functions";
import { UNIT_OPTIONS } from "@/lib/units";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/foods")({
  head: () => ({ meta: [{ title: "Foods — Atlas" }] }),
  component: FoodsPage,
});

function FoodsPage() {
  const [search, setSearch] = useState("");
  const foods = useFoods(search);
  const [dialog, setDialog] = useState<Partial<Food> | null>(null);
  const [usdaOpen, setUsdaOpen] = useState(false);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Nutrition Library</p>
          <h1 className="text-4xl font-bold tracking-tight">Foods</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setUsdaOpen(true)}>
            <Wand2 className="mr-1 size-4" /> USDA search
          </Button>
          <Button onClick={() => setDialog({ source: "manual", serving_size: 1, serving_unit: "serving" })}>
            <Plus className="mr-1 size-4" /> Manual
          </Button>
        </div>
      </header>

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
            <p>No foods yet. Import from USDA or add manually.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(foods.data ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => setDialog(f)}
                className="rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:scale-[1.01] hover:bg-white/10"
              >
                <p className="font-medium">{f.name}</p>
                {f.brand && <p className="text-xs text-muted-foreground">{f.brand}</p>}
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {f.serving_size ?? "?"} {f.serving_unit ?? ""} · {f.calories ?? "?"} kcal · {f.source}
                </p>
                <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                  <span>P {f.protein_g ?? "–"}g</span>
                  <span>C {f.carbs_g ?? "–"}g</span>
                  <span>F {f.fat_g ?? "–"}g</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      <FoodDialog open={dialog !== null} initial={dialog} onClose={() => setDialog(null)} />
      <UsdaDialog open={usdaOpen} onClose={() => setUsdaOpen(false)} onPickEdit={(draft) => { setUsdaOpen(false); setDialog(draft); }} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function FoodDialog({ open, initial, onClose }: { open: boolean; initial: Partial<Food> | null; onClose: () => void }) {
  const upsert = useUpsertFood();
  const del = useDeleteFood();
  const [form, setForm] = useState<Partial<Food>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);

  function num(name: keyof Food) {
    const v = form[name] as any;
    return v == null ? "" : String(v);
  }
  function setNum(name: keyof Food, v: string) {
    setForm({ ...form, [name]: v === "" ? null : Number(v) } as any);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Food" : "New Food"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Brand"><Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value || null })} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Serving size"><Input type="number" step="0.01" value={num("serving_size")} onChange={(e) => setNum("serving_size", e.target.value)} /></Field>
            <Field label="Serving unit">
              <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.serving_unit ?? ""} onChange={(e) => setForm({ ...form, serving_unit: e.target.value || null })}>
                <option value="">unit</option>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="g / serving (if count/vol)"><Input type="number" step="0.01" value={num("grams_per_serving")} onChange={(e) => setNum("grams_per_serving", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Calories"><Input type="number" value={num("calories")} onChange={(e) => setNum("calories", e.target.value)} /></Field>
            <Field label="Protein g"><Input type="number" step="0.1" value={num("protein_g")} onChange={(e) => setNum("protein_g", e.target.value)} /></Field>
            <Field label="Carbs g"><Input type="number" step="0.1" value={num("carbs_g")} onChange={(e) => setNum("carbs_g", e.target.value)} /></Field>
            <Field label="Fat g"><Input type="number" step="0.1" value={num("fat_g")} onChange={(e) => setNum("fat_g", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Fiber g"><Input type="number" step="0.1" value={num("fiber_g")} onChange={(e) => setNum("fiber_g", e.target.value)} /></Field>
            <Field label="Sugar g"><Input type="number" step="0.1" value={num("sugar_g")} onChange={(e) => setNum("sugar_g", e.target.value)} /></Field>
            <Field label="Sodium mg"><Input type="number" step="1" value={num("sodium_mg")} onChange={(e) => setNum("sodium_mg", e.target.value)} /></Field>
            <Field label="Density g/ml"><Input type="number" step="0.001" value={num("density_g_per_ml")} onChange={(e) => setNum("density_g_per_ml", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Barcode"><Input value={form.barcode ?? ""} onChange={(e) => setForm({ ...form, barcode: e.target.value || null })} /></Field>
            <Field label="Source">
              <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.source ?? "manual"} onChange={(e) => setForm({ ...form, source: e.target.value as Food["source"] })}>
                <option value="manual">manual</option>
                <option value="usda">usda</option>
                <option value="barcode">barcode</option>
                <option value="imported">imported</option>
              </select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Nutrition should reflect one serving. Set g/serving when serving unit is count or volume so recipe math stays accurate.</p>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && (
            <Button variant="destructive" onClick={() => { if (confirm("Delete food?")) { del.mutate(initial.id!); onClose(); } }}>
              <Trash2 className="mr-1 size-4" /> Delete
            </Button>
          )}
          <Button onClick={async () => { if (!form.name) { toast.error("Name required"); return; } await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsdaDialog({ open, onClose, onPickEdit }: { open: boolean; onClose: () => void; onPickEdit: (draft: Partial<Food>) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<UsdaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const search = useServerFn(searchUsdaFoods);
  const detail = useServerFn(getUsdaFood);
  const upsert = useUpsertFood();

  async function run() {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const r = await search({ data: { query: q } });
      setHits(r.hits);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSearching(false); }
  }

  async function importHit(h: UsdaSearchHit, action: "save" | "edit") {
    setLoadingId(h.fdcId);
    try {
      const d = await detail({ data: { fdcId: h.fdcId } });
      const draft: Partial<Food> = {
        name: d.description,
        brand: d.brand ?? null,
        source: "usda",
        external_id: String(d.fdcId),
        serving_size: d.servingSize ?? null,
        serving_unit: (d.servingSizeUnit || "g").toLowerCase().replace("grm", "g"),
        grams_per_serving: d.gramsPerServing ?? null,
        calories: d.calories ?? null,
        protein_g: d.protein_g ?? null,
        carbs_g: d.carbs_g ?? null,
        fat_g: d.fat_g ?? null,
        fiber_g: d.fiber_g ?? null,
        sugar_g: d.sugar_g ?? null,
        sodium_mg: d.sodium_mg ?? null,
      };
      if (action === "edit") { onPickEdit(draft); return; }
      await upsert.mutateAsync(draft as any);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoadingId(null); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>USDA FoodData Central</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
          <Input placeholder="e.g. rolled oats, banana, greek yogurt" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <Button type="submit" disabled={searching}>{searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</Button>
        </form>
        <div className="mt-4 space-y-1">
          {hits.length === 0 && !searching && <p className="py-8 text-center text-sm text-muted-foreground">Type a query and press enter.</p>}
          {hits.map((h) => (
            <div key={h.fdcId} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.description}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[h.brandOwner || h.brandName, h.dataType, h.servingSize ? `${h.servingSize} ${h.servingSizeUnit}` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button size="sm" variant="ghost" disabled={loadingId === h.fdcId} onClick={() => importHit(h, "edit")}>Edit</Button>
              <Button size="sm" disabled={loadingId === h.fdcId} onClick={() => importHit(h, "save")}>
                {loadingId === h.fdcId ? <Loader2 className="size-4 animate-spin" /> : "Import"}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Imported values come from USDA labels. You can correct anything after import.</p>
      </DialogContent>
    </Dialog>
  );
}
