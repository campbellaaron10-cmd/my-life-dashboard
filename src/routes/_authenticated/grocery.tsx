import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, ShoppingBasket, Check } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useGrocery, useUpsertGrocery, useDeleteGrocery, type GroceryItem } from "@/lib/atlas-data";

export const Route = createFileRoute("/_authenticated/grocery")({
  head: () => ({ meta: [{ title: "Grocery — Atlas" }] }),
  component: GroceryPage,
});

function GroceryPage() {
  const items = useGrocery();
  const upsert = useUpsertGrocery();
  const del = useDeleteGrocery();
  const [name, setName] = useState("");

  const active = (items.data ?? []).filter((i) => !i.is_checked);
  const done = (items.data ?? []).filter((i) => i.is_checked);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    await upsert.mutateAsync({ name: trimmed, quantity: 1 });
  }

  async function clearChecked() {
    if (!done.length) return;
    if (!confirm(`Clear ${done.length} checked item(s)?`)) return;
    await Promise.all(done.map((i) => del.mutateAsync(i.id)));
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Shopping List</p>
          <h1 className="text-4xl font-bold tracking-tight">Grocery</h1>
        </div>
        {done.length > 0 && (
          <Button variant="secondary" onClick={clearChecked}>
            <Check className="mr-1 size-4" /> Clear checked ({done.length})
          </Button>
        )}
      </header>

      <GlassCard>
        <form
          onSubmit={(e) => { e.preventDefault(); add(); }}
          className="mb-6 flex gap-2 border-b border-white/5 pb-6"
        >
          <Input
            placeholder="Add an item and press enter…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg"
          />
          <Button type="submit" disabled={!name.trim()}><Plus className="size-4" /></Button>
        </form>

        {active.length === 0 && done.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <ShoppingBasket className="size-10 opacity-40" />
            <p>Your list is empty. Add an item above.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {active.map((item) => <Row key={item.id} item={item} onDelete={() => del.mutate(item.id)} onToggle={(v) => upsert.mutate({ id: item.id, name: item.name, is_checked: v })} />)}
            {done.length > 0 && (
              <div className="mt-6 border-t border-white/5 pt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Checked</p>
                {done.map((item) => <Row key={item.id} item={item} onDelete={() => del.mutate(item.id)} onToggle={(v) => upsert.mutate({ id: item.id, name: item.name, is_checked: v })} />)}
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function Row({ item, onDelete, onToggle }: { item: GroceryItem; onDelete: () => void; onToggle: (v: boolean) => void }) {
  return (
    <div className="group flex items-center gap-4 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5">
      <Checkbox checked={item.is_checked} onCheckedChange={(v) => onToggle(Boolean(v))} />
      <span className={`flex-1 text-base ${item.is_checked ? "line-through opacity-50" : ""}`}>{item.name}</span>
      {item.quantity > 1 && <span className="font-mono text-xs text-muted-foreground">×{item.quantity}</span>}
      <button className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-warning group-hover:opacity-100" onClick={onDelete}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
