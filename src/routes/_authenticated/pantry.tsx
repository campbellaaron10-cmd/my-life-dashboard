import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, Refrigerator } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePantry, useUpsertPantry, useDeletePantry, useFoods, daysUntil, type PantryItem } from "@/lib/atlas-data";

export const Route = createFileRoute("/_authenticated/pantry")({
  head: () => ({ meta: [{ title: "Pantry — Atlas" }] }),
  component: PantryPage,
});

const LOCATIONS = ["pantry", "fridge", "freezer", "other"] as const;

function PantryPage() {
  const items = usePantry();
  const [dialog, setDialog] = useState<Partial<PantryItem> | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const list = items.data ?? [];
    if (filter === "all") return list;
    if (filter === "expiring") return list.filter((i) => { const d = daysUntil(i.expires_on); return d !== null && d <= 3; });
    return list.filter((i) => i.location === filter);
  }, [items.data, filter]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Inventory</p>
          <h1 className="text-4xl font-bold tracking-tight">Pantry</h1>
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
            <p>Nothing here. Add your first item to track expirations.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const d = daysUntil(item.expires_on);
              const urgent = d !== null && d <= 3;
              const expired = d !== null && d < 0;
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
                    </div>
                    {urgent && <AlertTriangle className="size-4 text-warning" />}
                  </div>
                  {item.expires_on && (
                    <p className={`mt-3 font-mono text-xs uppercase ${urgent ? "text-warning" : "text-muted-foreground"}`}>
                      {expired ? `Expired ${Math.abs(d)}d ago` : d === 0 ? "Expires today" : `Expires in ${d}d`}
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

function PantryDialog({ open, initial, onClose }: { open: boolean; initial: Partial<PantryItem> | null; onClose: () => void }) {
  const upsert = useUpsertPantry();
  const del = useDeletePantry();
  const [form, setForm] = useState<Partial<PantryItem>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Qty"><Input type="number" step="0.1" value={form.quantity ?? 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><Field label="Unit"><Input placeholder="lb, oz, ct…" value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field></div>
          </div>
          <Field label="Location">
            <Select value={form.location ?? "pantry"} onValueChange={(v) => setForm({ ...form, location: v as PantryItem["location"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchased">
              <Input type="date" value={form.purchased_on?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, purchased_on: e.target.value || null })} />
            </Field>
            <Field label="Expires">
              <Input type="date" value={form.expires_on?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, expires_on: e.target.value || null })} />
            </Field>
          </div>
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
          <Button onClick={async () => { if (!form.name) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
