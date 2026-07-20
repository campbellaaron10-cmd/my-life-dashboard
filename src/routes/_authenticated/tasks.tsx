import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckSquare, Flag, ShoppingBag, Search } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useTasks, useUpsertTask, useDeleteTask, daysUntil,
  useFoods, useUpsertPantry, type Task, type Food,
} from "@/lib/atlas-data";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Atlas" }] }),
  component: TasksPage,
});

const PRIORITIES = ["low", "normal", "high"] as const;

function TasksPage() {
  const tasks = useTasks();
  const upsert = useUpsertTask();
  const del = useDeleteTask();
  const foods = useFoods();
  const upsertPantry = useUpsertPantry();
  const [dialog, setDialog] = useState<Partial<Task> | null>(null);
  const [quick, setQuick] = useState("");
  const [pantryPrompt, setPantryPrompt] = useState<Task | null>(null);

  const foodsById = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of foods.data ?? []) m.set(f.id, f);
    return m;
  }, [foods.data]);

  const groups = useMemo(() => {
    const list = tasks.data ?? [];
    const shopping: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const later: Task[] = [];
    const done: Task[] = [];
    for (const t of list) {
      if (t.is_done) { done.push(t); continue; }
      if (t.kind === "shopping") { shopping.push(t); continue; }
      const d = daysUntil(t.due_on);
      if (d === null) later.push(t);
      else if (d <= 0) today.push(t);
      else if (d <= 7) upcoming.push(t);
      else later.push(t);
    }
    return { shopping, today, upcoming, later, done };
  }, [tasks.data]);

  async function addQuick() {
    const t = quick.trim();
    if (!t) return;
    setQuick("");
    await upsert.mutateAsync({ title: t, priority: "normal" });
  }

  async function handleToggle(task: Task, done: boolean) {
    await upsert.mutateAsync({ id: task.id, title: task.title, is_done: done });
    if (done && task.kind === "shopping" && task.food_id) {
      setPantryPrompt(task);
    }
  }

  async function acceptPantry() {
    if (!pantryPrompt) return;
    const t = pantryPrompt;
    const food = t.food_id ? foodsById.get(t.food_id) : undefined;
    await upsertPantry.mutateAsync({
      name: food?.name ?? t.title.replace(/^buy\s+/i, ""),
      food_id: t.food_id ?? null,
      quantity: Number(t.quantity ?? 1),
      unit: t.unit ?? null,
      location: "pantry",
      purchased_on: new Date().toISOString().slice(0, 10),
    });
    setPantryPrompt(null);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily Protocols</p>
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialog({ priority: "normal", kind: "shopping", quantity: 1 })}>
            <ShoppingBag className="mr-1 size-4" /> Shopping item
          </Button>
          <Button onClick={() => setDialog({ priority: "normal", kind: "general" })}>
            <Plus className="mr-1 size-4" /> New Task
          </Button>
        </div>
      </header>

      <GlassCard>
        <form onSubmit={(e) => { e.preventDefault(); addQuick(); }} className="mb-6 flex gap-2 border-b border-white/5 pb-6">
          <Input placeholder="Quick add task…" value={quick} onChange={(e) => setQuick(e.target.value)} className="text-lg" />
          <Button type="submit" disabled={!quick.trim()}><Plus className="size-4" /></Button>
        </form>

        {tasks.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (tasks.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <CheckSquare className="size-10 opacity-40" />
            <p>All clear. Add your first task above.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.shopping.length > 0 && (
              <Group title="Shopping" icon={ShoppingBag} items={groups.shopping} foodsById={foodsById} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={handleToggle} />
            )}
            <Group title="Today / Overdue" items={groups.today} foodsById={foodsById} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={handleToggle} />
            <Group title="Next 7 days" items={groups.upcoming} foodsById={foodsById} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={handleToggle} />
            <Group title="Later" items={groups.later} foodsById={foodsById} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={handleToggle} />
            {groups.done.length > 0 && (
              <Group title={`Done (${groups.done.length})`} items={groups.done} foodsById={foodsById} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={handleToggle} muted />
            )}
          </div>
        )}
      </GlassCard>

      <TaskDialog open={dialog !== null} initial={dialog} onClose={() => setDialog(null)} foods={foods.data ?? []} />

      <Dialog open={pantryPrompt !== null} onOpenChange={(o) => !o && setPantryPrompt(null)}>
        <DialogContent className="glass-panel">
          <DialogHeader><DialogTitle>Add to pantry?</DialogTitle></DialogHeader>
          {pantryPrompt && (
            <p className="text-sm text-muted-foreground">
              Did you buy <span className="text-foreground">{pantryPrompt.quantity ?? 1} {pantryPrompt.unit ?? "item"}</span> of{" "}
              <span className="text-foreground">{pantryPrompt.food_id ? (foodsById.get(pantryPrompt.food_id)?.name ?? pantryPrompt.title) : pantryPrompt.title}</span>?
              I can log it in Pantry.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPantryPrompt(null)}>Skip</Button>
            <Button onClick={acceptPantry}>Add to Pantry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Group({ title, icon: Icon, items, foodsById, onEdit, onDelete, onToggle, muted }: {
  title: string;
  icon?: typeof ShoppingBag;
  items: Task[];
  foodsById: Map<string, Food>;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onToggle: (t: Task, done: boolean) => void | Promise<void>;
  muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="size-3" />} {title}
      </h3>
      <div className="space-y-1">
        {items.map((t) => {
          const d = daysUntil(t.due_on);
          const overdue = !t.is_done && d !== null && d < 0;
          const food = t.food_id ? foodsById.get(t.food_id) : undefined;
          return (
            <div key={t.id} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5 ${muted ? "opacity-50" : ""}`}>
              <Checkbox checked={t.is_done} onCheckedChange={(v) => onToggle(t, Boolean(v))} />
              <button className="flex-1 text-left" onClick={() => onEdit(t)}>
                <p className={`text-base ${t.is_done ? "line-through" : ""}`}>{t.title}</p>
                <div className="mt-0.5 flex items-center gap-3 font-mono text-[10px] uppercase text-muted-foreground">
                  {t.kind === "shopping" && <span className="text-primary">Shopping</span>}
                  {food && <span>· {food.name}{t.quantity ? ` · ${t.quantity}${t.unit ? ` ${t.unit}` : ""}` : ""}</span>}
                  {t.priority === "high" && <span className="flex items-center gap-1 text-warning"><Flag className="size-3" />High</span>}
                  {t.project && <span>{t.project}</span>}
                  {t.due_on && <span className={overdue ? "text-warning" : ""}>{overdue ? `${Math.abs(d!)}d overdue` : d === 0 ? "Today" : `${d}d`}</span>}
                </div>
              </button>
              <button className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-warning group-hover:opacity-100" onClick={() => { if (confirm("Delete?")) onDelete(t.id); }}>
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskDialog({ open, initial, onClose, foods }: { open: boolean; initial: Partial<Task> | null; onClose: () => void; foods: Food[] }) {
  const upsert = useUpsertTask();
  const [form, setForm] = useState<Partial<Task>>({});
  const [foodQuery, setFoodQuery] = useState("");
  useEffect(() => { setForm(initial ?? {}); setFoodQuery(""); }, [initial]);

  const isShopping = form.kind === "shopping";
  const linkedFood = form.food_id ? foods.find((f) => f.id === form.food_id) : undefined;
  const matches = foodQuery ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.toLowerCase())).slice(0, 8) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Task" : isShopping ? "New Shopping Item" : "New Task"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Kind">
            <Select value={form.kind ?? "general"} onValueChange={(v) => setForm({ ...form, kind: v as Task["kind"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>

          {isShopping && (
            <>
              <Field label="Linked food (optional)">
                {linkedFood ? (
                  <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                    <span className="text-sm">{linkedFood.name}{linkedFood.brand ? ` · ${linkedFood.brand}` : ""}</span>
                    <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, food_id: null })}>Change</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Search className="size-4 text-muted-foreground" />
                      <Input placeholder="Search foods…" value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} />
                    </div>
                    {matches.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-white/5 bg-white/5">
                        {matches.map((f) => (
                          <button key={f.id} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/10"
                            onClick={() => { setForm({ ...form, food_id: f.id, title: form.title || `Buy ${f.name}` }); setFoodQuery(""); }}>
                            <span className="text-sm">{f.name}</span>
                            {f.brand && <span className="text-[10px] text-muted-foreground">{f.brand}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity"><Input type="number" step="0.1" value={form.quantity ?? 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
                <Field label="Unit"><Input placeholder="lb, ct, cup…" value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value || null })} /></Field>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select value={form.priority ?? "normal"} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Due">
              <Input type="date" value={form.due_on?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, due_on: e.target.value || null })} />
            </Field>
          </div>
          <Field label="Project"><Input value={form.project ?? ""} onChange={(e) => setForm({ ...form, project: e.target.value })} /></Field>
          <Field label="Notes"><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button onClick={async () => { if (!form.title) return; await upsert.mutateAsync(form as any); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
