import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, AlertTriangle, Refrigerator, Search, Loader2, Sparkles, Check } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { FoodTabs } from "@/components/atlas/FoodTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  usePantry, useUpsertPantry, useDeletePantry, useFoods, useImportUsdaFood, useBackfillPantryFoods,
  daysUntil, describeUnitKind, type PantryItem, type Food,
} from "@/lib/atlas-data";
import { searchUsdaFoods, getUsdaFood, type UsdaSearchHit } from "@/lib/usda.functions";
import { estimateShelfLife, type ShelfLocation } from "@/lib/shelf-life";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pantry")({
  head: () => ({ meta: [{ title: "Pantry — Atlas" }] }),
  component: PantryPage,
});

const LOCATIONS = ["pantry", "fridge", "freezer", "other"] as const;

function PantryPage() {
  const items = usePantry();
  const foods = useFoods();
  const [dialog, setDialog] = useState<Partial<PantryItem> | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const foodsById = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of foods.data ?? []) m.set(f.id, f);
    return m;
  }, [foods.data]);

  const filtered = useMemo(() => {
    const list = items.data ?? [];
    if (filter === "all") return list;
    if (filter === "expiring") return list.filter((i) => { const d = daysUntil(i.expires_on); return d !== null && d <= 3; });
    return list.filter((i) => i.location === filter);
  }, [items.data, filter]);

  return (
    <div className="space-y-8">
      <FoodTabs />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Inventory</p>
          <h1 className="text-4xl font-bold tracking-tight">Pantry</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add items with USDA search built-in. Atlas saves the nutrition profile once and reuses it whenever you buy the same thing again.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="expiring">Expiring soon</SelectItem>
              {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialog({ location: "pantry", quantity: 1 })}>
            <Plus className="mr-1 size-4" /> Item
          </Button>
        </div>
      </header>

      <GlassCard>
        {items.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Refrigerator className="size-10 opacity-40" />
            <p>Nothing here. Add your first item — search USDA right from the add screen.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const d = daysUntil(item.expires_on);
              const urgent = d !== null && d <= 3;
              const expired = d !== null && d < 0;
              const food = item.food_id ? foodsById.get(item.food_id) : undefined;
              const estimated = !!(item.notes && item.notes.includes("[use-by est]"));
              return (
                <button
                  key={item.id}
                  onClick={() => setDialog(item)}
                  className={`group rounded-2xl border p-4 text-left transition-all hover:scale-[1.01] ${
                    expired ? "border-warning/50 bg-warning/10" : urgent ? "border-warning/30 bg-warning/5" : "border-white/5 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {item.location} · {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                      </p>
                      {food && <p className="mt-1 text-[10px] text-primary/80">→ {food.name}</p>}
                    </div>
                    {urgent && <AlertTriangle className="size-4 text-warning" />}
                  </div>
                  {item.expires_on && (
                    <p className={`mt-3 font-mono text-xs uppercase ${urgent ? "text-warning" : "text-muted-foreground"}`}>
                      {expired ? `Expired ${Math.abs(d!)}d ago` : d === 0 ? "Expires today" : `Expires in ${d}d`}
                      {estimated && <span className="ml-1 opacity-60">· est.</span>}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      <PantryDialog open={dialog !== null} initial={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

const EST_TAG = "[use-by est]";

function PantryDialog({ open, initial, onClose }: { open: boolean; initial: Partial<PantryItem> | null; onClose: () => void }) {
  const upsert = useUpsertPantry();
  const del = useDeletePantry();
  const foods = useFoods();
  const pantry = usePantry();
  const importUsda = useImportUsdaFood();
  const usdaSearch = useServerFn(searchUsdaFoods);
  const usdaGet = useServerFn(getUsdaFood);

  const [form, setForm] = useState<Partial<PantryItem>>({});
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<UsdaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [userEditedExpires, setUserEditedExpires] = useState(false);

  useEffect(() => {
    setForm(initial ?? {});
    setQuery("");
    setHits([]);
    setUserEditedExpires(false);
  }, [initial]);

  const linkedFood = form.food_id ? (foods.data ?? []).find((f) => f.id === form.food_id) : undefined;

  // Recent / frequent food quick picks derived from pantry history.
  const quickPicks = useMemo(() => {
    const counts = new Map<string, { count: number; last: string }>();
    for (const p of pantry.data ?? []) {
      if (!p.food_id) continue;
      const prev = counts.get(p.food_id);
      const created = p.created_at ?? "";
      if (prev) { prev.count++; if (created > prev.last) prev.last = created; }
      else counts.set(p.food_id, { count: 1, last: created });
    }
    const ranked = [...counts.entries()]
      .map(([id, v]) => ({ food: (foods.data ?? []).find((f) => f.id === id), ...v }))
      .filter((r) => r.food)
      .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
      .slice(0, 6);
    return ranked;
  }, [pantry.data, foods.data]);

  const librarySuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return (foods.data ?? []).filter((f) => f.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, foods.data]);

  // Estimated use-by: recompute whenever inputs change and user hasn't overridden.
  const estimate = useMemo(() => {
    if (!form.name) return null;
    return estimateShelfLife({
      foodName: form.name,
      location: (form.location as ShelfLocation) ?? "pantry",
      purchasedOn: form.purchased_on ?? null,
      openedOn: form.opened_on ?? null,
    });
  }, [form.name, form.location, form.purchased_on, form.opened_on]);

  useEffect(() => {
    if (userEditedExpires || !estimate) return;
    // Only auto-fill when nothing set, or the previous value was our estimate tag.
    const notes = form.notes ?? "";
    const isEstimated = notes.includes(EST_TAG);
    if (!form.expires_on || isEstimated) {
      const cleanedNotes = notes.replace(new RegExp(`\\s*${EST_TAG.replace(/[[\]]/g, "\\$&")}[^\\n]*`), "").trim();
      const tag = `${EST_TAG} ${estimate.label}, ${estimate.opened ? "opened" : "unopened"} in ${form.location ?? "pantry"} (~${estimate.days}d)`;
      setForm((f) => ({
        ...f,
        expires_on: estimate.useByDate,
        notes: cleanedNotes ? `${cleanedNotes}\n${tag}` : tag,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate?.useByDate]);

  async function runUsda(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await usdaSearch({ data: { query, pageSize: 10 } });
      setHits(r.hits);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function pickUsda(hit: UsdaSearchHit) {
    setImportingId(hit.fdcId);
    try {
      const d = await usdaGet({ data: { fdcId: hit.fdcId } });
      const food = await importUsda.mutateAsync(d);
      setForm((f) => ({ ...f, food_id: food.id, name: f.name || food.name }));
      setHits([]);
      setQuery("");
      toast.success(`Linked ${food.name}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImportingId(null);
    }
  }

  function pickSavedFood(f: Food) {
    setForm((prev) => ({ ...prev, food_id: f.id, name: prev.name || f.name }));
    setHits([]);
    setQuery("");
  }

  const unitHint = describeUnitKind(form.unit);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Pantry Item" : "Add Pantry Item"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!linkedFood && !initial?.id && (
            <>
              {quickPicks.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Recently added</p>
                  <div className="flex flex-wrap gap-2">
                    {quickPicks.map(({ food }) => (
                      <button
                        key={food!.id}
                        onClick={() => pickSavedFood(food!)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                      >
                        {food!.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Find a food</p>
                <form onSubmit={runUsda} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search USDA or your library — e.g. 2% milk"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button type="submit" disabled={searching}>
                    {searching ? <Loader2 className="size-4 animate-spin" /> : "USDA"}
                  </Button>
                </form>

                {(librarySuggestions.length > 0 || hits.length > 0) && (
                  <div className="mt-2 space-y-1 rounded-xl border border-white/5 bg-white/5 p-1">
                    {librarySuggestions.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => pickSavedFood(f)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10"
                      >
                        <span className="text-sm">
                          <span className="font-medium">{f.name}</span>
                          {f.brand && <span className="text-muted-foreground"> · {f.brand}</span>}
                        </span>
                        <span className="font-mono text-[10px] text-primary/80">saved</span>
                      </button>
                    ))}
                    {hits.map((h) => (
                      <button
                        key={h.fdcId}
                        onClick={() => pickUsda(h)}
                        disabled={importingId === h.fdcId}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10 disabled:opacity-50"
                      >
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
                  Selecting a USDA result saves nutrition to your Food Library — duplicates are reused automatically.
                </p>
              </div>
            </>
          )}

          {linkedFood && (
            <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{linkedFood.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[linkedFood.brand, linkedFood.source === "usda" ? `USDA #${linkedFood.external_id}` : "manual"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, food_id: null })}>Change</Button>
            </div>
          )}

          <Field label="Display name" hint={linkedFood ? undefined : "Auto-fills when you pick a food."}>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Qty"><Input type="number" step="0.1" value={form.quantity ?? 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
            <div className="col-span-2">
              <Field label={`Unit${unitHint !== "unknown" ? ` (${unitHint})` : ""}`}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.unit ?? ""}
                  onChange={(e) => setForm({ ...form, unit: e.target.value || null })}
                >
                  <option value="">unit…</option>
                  <optgroup label="Weight">
                    <option value="g">g</option><option value="kg">kg</option>
                    <option value="oz">oz (weight)</option><option value="lb">lb</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="ml">ml</option><option value="l">l</option>
                    <option value="fl oz">fl oz (volume)</option>
                    <option value="cup">cup</option><option value="tbsp">tbsp</option><option value="tsp">tsp</option>
                  </optgroup>
                  <optgroup label="Count">
                    <option value="piece">piece</option><option value="item">item</option><option value="serving">serving</option>
                  </optgroup>
                </select>
              </Field>
            </div>
          </div>

          <Field label="Location">
            <Select value={form.location ?? "pantry"} onValueChange={(v) => setForm({ ...form, location: v as PantryItem["location"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Purchased">
              <Input type="date" value={form.purchased_on?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, purchased_on: e.target.value || null })} />
            </Field>
            <Field label="Opened">
              <Input type="date" value={form.opened_on?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, opened_on: e.target.value || null })} />
            </Field>
            <Field label="Expires (printed)" hint="Overrides estimate.">
              <Input
                type="date"
                value={form.expires_on?.slice(0, 10) ?? ""}
                onChange={(e) => { setUserEditedExpires(true); setForm({ ...form, expires_on: e.target.value || null }); }}
              />
            </Field>
          </div>

          {estimate && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="flex-1">
                <p>
                  <span className="font-mono uppercase tracking-widest text-primary/80">Estimated use-by</span>{" "}
                  <span className="font-medium">{estimate.useByDate}</span>
                  <span className="text-muted-foreground"> · {estimate.label}, {estimate.opened ? "opened" : "unopened"} in {form.location ?? "pantry"} (~{estimate.days}d)</span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Rule-based estimate. Enter a printed date above to override.</p>
              </div>
              {!userEditedExpires && form.expires_on === estimate.useByDate && (
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
              )}
            </div>
          )}

          <Field label="Notes"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} /></Field>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id && (
            <>
              <Button variant="ghost" onClick={async () => { await upsert.mutateAsync({ id: initial.id, is_consumed: true, name: initial.name! }); onClose(); }}>
                Mark consumed
              </Button>
              <Button variant="destructive" onClick={() => { if (confirm("Delete?")) { del.mutate(initial.id!); onClose(); } }}>
                <Trash2 className="mr-1 size-4" /> Delete
              </Button>
            </>
          )}
          <Button onClick={async () => {
            if (!form.name) { toast.error("Pick a food or enter a name"); return; }
            await upsert.mutateAsync(form as any);
            onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
