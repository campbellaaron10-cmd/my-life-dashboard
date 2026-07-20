import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckSquare, Flag } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks, useUpsertTask, useDeleteTask, daysUntil, type Task } from "@/lib/atlas-data";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Atlas" }] }),
  component: TasksPage,
});

const PRIORITIES = ["low", "normal", "high"] as const;

function TasksPage() {
  const tasks = useTasks();
  const upsert = useUpsertTask();
  const del = useDeleteTask();
  const [dialog, setDialog] = useState<Partial<Task> | null>(null);
  const [quick, setQuick] = useState("");

  const groups = useMemo(() => {
    const list = tasks.data ?? [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const later: Task[] = [];
    const done: Task[] = [];
    for (const t of list) {
      if (t.is_done) { done.push(t); continue; }
      const d = daysUntil(t.due_on);
      if (d === null) later.push(t);
      else if (d <= 0) today.push(t);
      else if (d <= 7) upcoming.push(t);
      else later.push(t);
    }
    return { today, upcoming, later, done };
  }, [tasks.data]);

  async function addQuick() {
    const t = quick.trim();
    if (!t) return;
    setQuick("");
    await upsert.mutateAsync({ title: t, priority: "normal" });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily Protocols</p>
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
        </div>
        <Button onClick={() => setDialog({ priority: "normal" })}>
          <Plus className="mr-1 size-4" /> New Task
        </Button>
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
            <Group title="Today / Overdue" items={groups.today} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={(id, v, name) => upsert.mutate({ id, title: name, is_done: v })} />
            <Group title="Next 7 days" items={groups.upcoming} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={(id, v, name) => upsert.mutate({ id, title: name, is_done: v })} />
            <Group title="Later" items={groups.later} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={(id, v, name) => upsert.mutate({ id, title: name, is_done: v })} />
            {groups.done.length > 0 && (
              <Group title={`Done (${groups.done.length})`} items={groups.done} onEdit={setDialog} onDelete={(id) => del.mutate(id)} onToggle={(id, v, name) => upsert.mutate({ id, title: name, is_done: v })} muted />
            )}
          </div>
        )}
      </GlassCard>

      <TaskDialog open={dialog !== null} initial={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}

function Group({ title, items, onEdit, onDelete, onToggle, muted }: {
  title: string; items: Task[]; onEdit: (t: Task) => void; onDelete: (id: string) => void;
  onToggle: (id: string, done: boolean, name: string) => void; muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="space-y-1">
        {items.map((t) => {
          const d = daysUntil(t.due_on);
          const overdue = !t.is_done && d !== null && d < 0;
          return (
            <div key={t.id} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5 ${muted ? "opacity-50" : ""}`}>
              <Checkbox checked={t.is_done} onCheckedChange={(v) => onToggle(t.id, Boolean(v), t.title)} />
              <button className="flex-1 text-left" onClick={() => onEdit(t)}>
                <p className={`text-base ${t.is_done ? "line-through" : ""}`}>{t.title}</p>
                <div className="mt-0.5 flex items-center gap-3 font-mono text-[10px] uppercase text-muted-foreground">
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

function TaskDialog({ open, initial, onClose }: { open: boolean; initial: Partial<Task> | null; onClose: () => void }) {
  const upsert = useUpsertTask();
  const [form, setForm] = useState<Partial<Task>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
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
