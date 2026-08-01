import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, CheckSquare, Flag, ShoppingBag, Search, Folder, Repeat,
  Inbox, CalendarDays, AlertTriangle, ArchiveRestore, Tag, X,
  Paperclip, History, Link2, ListChecks, StickyNote,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useTasks, useUpsertTask, useDeleteTask, daysUntil,
  useFoods, useUpsertPantry,
  useProjects, useUpsertProject, useDeleteProject,
  type Task, type Food, type Project, type RecurrenceRule,
} from "@/lib/atlas-data";
import {
  PRIORITY_META, TASK_CATEGORIES, SourceBadge, SourcePill, getSourceMeta,
} from "@/lib/task-sources";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Atlas" },
      { name: "description", content: "The engine of Atlas — where Pantry, Trips, Finance, Weather, Calendar, and Vault converge into action." },
    ],
  }),
  component: TasksPage,
});

const PRIORITIES = ["low", "normal", "high"] as const;

type Bucket = "today" | "inbox" | "upcoming" | "overdue" | "shopping" | "completed" | "all";

function TasksPage() {
  const tasks = useTasks();
  const upsert = useUpsertTask();
  const del = useDeleteTask();
  const foods = useFoods();
  const upsertPantry = useUpsertPantry();
  const projects = useProjects();
  const upsertProject = useUpsertProject();
  const deleteProject = useDeleteProject();

  const [bucket, setBucket] = useState<Bucket>("today");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Partial<Task> | null>(null);
  const [pantryPrompt, setPantryPrompt] = useState<Task | null>(null);
  const [projectDialog, setProjectDialog] = useState<Partial<Project> | null>(null);
  const [quick, setQuick] = useState("");

  const allTasks = tasks.data ?? [];
  const foodsById = useMemo(() => new Map((foods.data ?? []).map((f) => [f.id, f])), [foods.data]);
  const projectsById = useMemo(() => new Map((projects.data ?? []).map((p) => [p.id, p])), [projects.data]);

  const categories = useMemo(() => {
    const s = new Set<string>(TASK_CATEGORIES);
    for (const t of allTasks) if (t.category) s.add(t.category);
    return Array.from(s).sort();
  }, [allTasks]);

  const counts = useMemo(() => {
    const c = { inbox: 0, today: 0, upcoming: 0, overdue: 0, shopping: 0, completed: 0 };
    for (const t of allTasks) {
      if (t.is_done) { c.completed++; continue; }
      if (t.kind === "shopping") { c.shopping++; continue; }
      const d = daysUntil(t.due_on);
      if (d === null) c.inbox++;
      else if (d < 0) c.overdue++;
      else if (d === 0) c.today++;
      else c.upcoming++;
    }
    return c;
  }, [allTasks]);

  const visible = useMemo(() => {
    return allTasks.filter((t) => {
      if (bucket !== "all") {
        if (bucket === "completed") { if (!t.is_done) return false; }
        else if (t.is_done) return false;

        if (bucket === "shopping") { if (t.kind !== "shopping") return false; }
        else if (t.kind === "shopping") return false;

        const d = daysUntil(t.due_on);
        if (bucket === "today" && d !== 0) return false;
        if (bucket === "upcoming" && (d === null || d <= 0)) return false;
        if (bucket === "overdue" && (d === null || d >= 0)) return false;
        if (bucket === "inbox" && d !== null) return false;
      }
      if (projectFilter && t.project_id !== projectFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.notes ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allTasks, bucket, projectFilter, categoryFilter, query]);

  async function addQuick() {
    const t = quick.trim();
    if (!t) return;
    setQuick("");
    await upsert.mutateAsync({
      title: t,
      priority: "normal",
      project_id: projectFilter ?? null,
      category: categoryFilter ?? null,
      due_on: bucket === "today" ? new Date().toISOString().slice(0, 10) : null,
    });
  }

  async function handleToggle(task: Task, done: boolean) {
    await upsert.mutateAsync({ ...task, is_done: done });
    if (done && task.kind === "shopping" && task.food_id) setPantryPrompt(task);
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">The engine of Atlas</p>
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Food, trips, finance, weather, and calendar all flow through here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialog({ priority: "normal", kind: "shopping", quantity: 1 })}>
            <ShoppingBag className="mr-1 size-4" /> Shopping item
          </Button>
          <Button onClick={() => setDialog({ priority: "normal", kind: "general", project_id: projectFilter ?? null, category: categoryFilter ?? null })}>
            <Plus className="mr-1 size-4" /> New Task
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <GlassCard className="col-span-12 md:col-span-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Views</p>
          <div className="space-y-1">
            <SidebarLink icon={CalendarDays} label="Today" count={counts.today} active={bucket === "today"} onClick={() => setBucket("today")} />
            <SidebarLink icon={Inbox} label="Inbox" count={counts.inbox} active={bucket === "inbox"} onClick={() => setBucket("inbox")} />
            <SidebarLink icon={CalendarDays} label="Upcoming" count={counts.upcoming} active={bucket === "upcoming"} onClick={() => setBucket("upcoming")} />
            <SidebarLink icon={AlertTriangle} label="Overdue" count={counts.overdue} active={bucket === "overdue"} tone={counts.overdue > 0 ? "warn" : undefined} onClick={() => setBucket("overdue")} />
            <SidebarLink icon={ShoppingBag} label="Shopping" count={counts.shopping} active={bucket === "shopping"} onClick={() => setBucket("shopping")} />
            <SidebarLink icon={CheckSquare} label="All" active={bucket === "all"} onClick={() => setBucket("all")} />
            <SidebarLink icon={ArchiveRestore} label="Completed" count={counts.completed} active={bucket === "completed"} onClick={() => setBucket("completed")} />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Projects</p>
            <button className="text-[10px] text-primary hover:underline" onClick={() => setProjectDialog({ status: "active" })}>+ Add</button>
          </div>
          <div className="mt-2 space-y-1">
            <button
              className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm ${projectFilter === null ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
              onClick={() => setProjectFilter(null)}
            >
              <span className="flex items-center gap-2"><Folder className="size-3.5" /> All projects</span>
            </button>
            {(projects.data ?? []).map((p) => {
              const count = allTasks.filter((t) => !t.is_done && t.project_id === p.id).length;
              return (
                <button
                  key={p.id}
                  className={`group flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm ${projectFilter === p.id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
                  onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)}
                  onDoubleClick={() => setProjectDialog(p)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: p.color ?? "#94a3b8" }} />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
                    <span
                      className="hidden text-muted-foreground/60 hover:text-warning group-hover:inline"
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete project "${p.name}"?`)) deleteProject.mutate(p.id); }}
                    >×</span>
                  </span>
                </button>
              );
            })}
            {(projects.data ?? []).length === 0 && (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">No projects yet.</p>
            )}
          </div>

          <p className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${categoryFilter === c ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
              >
                <Tag className="mr-1 inline size-2.5" />{c}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* List */}
        <GlassCard className="col-span-12 md:col-span-9">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addQuick(); }} className="flex flex-1 gap-2">
              <Input placeholder="Quick add…" value={quick} onChange={(e) => setQuick(e.target.value)} />
              <Button type="submit" disabled={!quick.trim()}><Plus className="size-4" /></Button>
            </form>
          </div>

          {tasks.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <CheckSquare className="size-10 opacity-40" />
              <p>Nothing here.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {visible.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  project={t.project_id ? projectsById.get(t.project_id) : undefined}
                  foodName={t.food_id ? foodsById.get(t.food_id)?.name : undefined}
                  onEdit={() => setDialog(t)}
                  onDelete={() => { if (confirm("Delete task?")) del.mutate(t.id); }}
                  onToggle={(v) => handleToggle(t, v)}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <TaskDialog
        open={dialog !== null}
        initial={dialog}
        projects={projects.data ?? []}
        categories={categories}
        foods={foods.data ?? []}
        foodsById={foodsById}
        projectsById={projectsById}
        onClose={() => setDialog(null)}
      />

      <ProjectDialog
        open={projectDialog !== null}
        initial={projectDialog}
        onClose={() => setProjectDialog(null)}
        onSave={async (p) => { await upsertProject.mutateAsync(p); setProjectDialog(null); }}
      />

      <Dialog open={pantryPrompt !== null} onOpenChange={(o) => !o && setPantryPrompt(null)}>
        <DialogContent className="glass-panel">
          <DialogHeader><DialogTitle>Add to pantry?</DialogTitle></DialogHeader>
          {pantryPrompt && (
            <p className="text-sm text-muted-foreground">
              Did you buy <span className="text-foreground">{pantryPrompt.quantity ?? 1} {pantryPrompt.unit ?? "item"}</span> of{" "}
              <span className="text-foreground">{pantryPrompt.food_id ? (foodsById.get(pantryPrompt.food_id)?.name ?? pantryPrompt.title) : pantryPrompt.title}</span>?
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

function SidebarLink({
  icon: Icon, label, count, active, tone, onClick,
}: { icon: typeof Inbox; label: string; count?: number; active?: boolean; tone?: "warn"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
        active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
      }`}
    >
      <span className="flex items-center gap-2"><Icon className={`size-3.5 ${tone === "warn" ? "text-warning" : ""}`} /> {label}</span>
      {count !== undefined && count > 0 && (
        <span className={`font-mono text-[10px] ${tone === "warn" ? "text-warning" : ""}`}>{count}</span>
      )}
    </button>
  );
}

function TaskRow({
  task, project, foodName, onEdit, onDelete, onToggle,
}: {
  task: Task;
  project?: Project;
  foodName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const d = daysUntil(task.due_on);
  const overdue = !task.is_done && d !== null && d < 0;
  const rule = task.recurrence_rule as RecurrenceRule | null;
  const isShopping = task.kind === "shopping";
  const prio = PRIORITY_META[task.priority as keyof typeof PRIORITY_META] ?? PRIORITY_META.normal;

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        isShopping
          ? "border-primary/20 bg-primary/[0.06] hover:bg-primary/[0.10]"
          : "border-transparent hover:bg-white/5"
      }`}
    >
      {/* Priority dot */}
      <span
        className={`mt-2 size-2 shrink-0 rounded-full ${prio.dot} ring-2 ${prio.ring}`}
        title={`${prio.label} priority`}
      />
      <Checkbox className="mt-0.5" checked={task.is_done} onCheckedChange={(v) => onToggle(Boolean(v))} />
      <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <div className="flex items-center gap-2">
          {isShopping && <ShoppingBag className="size-4 shrink-0 text-primary" />}
          <p className={`text-base ${task.is_done ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase text-muted-foreground">
          <SourceBadge source={task.source_module} />
          {isShopping && foodName && <span>{foodName}{task.quantity ? ` · ${task.quantity}${task.unit ? ` ${task.unit}` : ""}` : ""}</span>}
          {task.priority !== "normal" && (
            <span className={`flex items-center gap-1 ${prio.text}`}>
              <Flag className="size-3" />{prio.label}
            </span>
          )}
          {project && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ background: project.color ?? "#94a3b8" }} />
              {project.name}
            </span>
          )}
          {task.category && <span>#{task.category}</span>}
          {rule && rule.every > 0 && (
            <span className="flex items-center gap-1 text-primary/80">
              <Repeat className="size-3" />
              every {rule.every} {rule.unit}{rule.every > 1 ? "s" : ""}
            </span>
          )}
          {task.due_on && <span className={overdue ? "text-warning" : ""}>{overdue ? `${Math.abs(d!)}d overdue` : d === 0 ? "Today" : `${d}d`}</span>}
        </div>
        {task.notes && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{task.notes}</p>}
      </button>
      <button className="p-1 text-muted-foreground opacity-0 transition-opacity hover:text-warning group-hover:opacity-100" onClick={onDelete}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// --- Checklist parsing helpers -------------------------------------------
// Stored inline in notes as `- [ ]` / `- [x]` lines so we don't add a field.
type ChecklistItem = { done: boolean; text: string; raw: string };
function parseNotes(notes: string | null): { text: string; items: ChecklistItem[] } {
  const raw = notes ?? "";
  const items: ChecklistItem[] = [];
  const lines = raw.split("\n");
  const other: string[] = [];
  for (const line of lines) {
    const m = /^\s*-\s*\[([ xX])\]\s*(.*)$/.exec(line);
    if (m) items.push({ done: m[1].toLowerCase() === "x", text: m[2], raw: line });
    else other.push(line);
  }
  return { text: other.join("\n"), items };
}

function TaskDialog({
  open, initial, projects, categories, foods, foodsById, projectsById, onClose,
}: {
  open: boolean;
  initial: Partial<Task> | null;
  projects: Project[];
  categories: string[];
  foods: Food[];
  foodsById: Map<string, Food>;
  projectsById: Map<string, Project>;
  onClose: () => void;
}) {
  const upsert = useUpsertTask();
  const [form, setForm] = useState<Partial<Task>>({});
  const [foodQuery, setFoodQuery] = useState("");
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [rule, setRule] = useState<RecurrenceRule>({ every: 1, unit: "month", anchor: "due" });
  const [customCat, setCustomCat] = useState(false);
  const [newChecklist, setNewChecklist] = useState("");

  useEffect(() => {
    setForm(initial ?? {});
    setFoodQuery("");
    const r = initial?.recurrence_rule as RecurrenceRule | null | undefined;
    if (r && r.every) { setRecurEnabled(true); setRule(r); }
    else { setRecurEnabled(false); setRule({ every: 1, unit: "month", anchor: "due" }); }
    const cat = initial?.category ?? "";
    setCustomCat(cat !== "" && !(TASK_CATEGORIES as readonly string[]).includes(cat));
    setNewChecklist("");
  }, [initial]);

  const isShopping = form.kind === "shopping";
  const linkedFood = form.food_id ? foods.find((f) => f.id === form.food_id) : undefined;
  const matches = foodQuery ? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.toLowerCase())).slice(0, 8) : [];
  const parsed = parseNotes(form.notes ?? null);
  const sourceMeta = getSourceMeta(form.source_module);
  const linkedProject = form.project_id ? projectsById.get(form.project_id) : undefined;
  const sourceRef = form.source_ref as { id?: string; label?: string } | null | undefined;

  async function save() {
    if (!form.title) return;
    const payload: any = { ...form, recurrence_rule: recurEnabled ? rule : null };
    await upsert.mutateAsync(payload);
    onClose();
  }

  function updateChecklist(idx: number, done: boolean) {
    const items = [...parsed.items];
    items[idx] = { ...items[idx], done };
    serializeNotes(parsed.text, items);
  }
  function removeChecklist(idx: number) {
    const items = parsed.items.filter((_, i) => i !== idx);
    serializeNotes(parsed.text, items);
  }
  function addChecklist() {
    const t = newChecklist.trim();
    if (!t) return;
    const items = [...parsed.items, { done: false, text: t, raw: `- [ ] ${t}` }];
    serializeNotes(parsed.text, items);
    setNewChecklist("");
  }
  function serializeNotes(text: string, items: ChecklistItem[]) {
    const lines: string[] = [];
    if (text) lines.push(text);
    for (const it of items) lines.push(`- [${it.done ? "x" : " "}] ${it.text}`);
    setForm((f) => ({ ...f, notes: lines.join("\n") }));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isShopping && <ShoppingBag className="size-4 text-primary" />}
            {initial?.id ? "Edit Task" : isShopping ? "New Shopping Item" : "New Task"}
          </DialogTitle>
        </DialogHeader>

        {/* Source pill — the "why does this task exist" line */}
        {initial?.id && (
          <div className="flex flex-wrap items-center gap-2">
            <SourcePill source={form.source_module} />
            {sourceMeta && sourceRef?.id && (
              <Link to={sourceMeta.to} className="text-[11px] text-primary hover:underline">
                View in {sourceMeta.label} →
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT: core fields */}
          <div className="space-y-4">
            <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>

            <Field label="Kind">
              <Select value={form.kind ?? "general"} onValueChange={(v) => setForm({ ...form, kind: v as Task["kind"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </Field>

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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${PRIORITY_META[p].dot}`} />
                          {PRIORITY_META[p].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Due">
                <Input type="date" value={form.due_on?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, due_on: e.target.value || null })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Project">
                <Select value={form.project_id ?? "__none"} onValueChange={(v) => setForm({ ...form, project_id: v === "__none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Category">
                {customCat ? (
                  <div className="flex gap-1">
                    <Input
                      placeholder="Custom category"
                      value={form.category ?? ""}
                      onChange={(e) => setForm({ ...form, category: e.target.value || null })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => { setCustomCat(false); setForm({ ...form, category: null }); }}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={form.category ?? "__none"}
                    onValueChange={(v) => {
                      if (v === "__custom") { setCustomCat(true); setForm({ ...form, category: "" }); }
                      else if (v === "__none") setForm({ ...form, category: null });
                      else setForm({ ...form, category: v });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="__custom">+ Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
          </div>

          {/* RIGHT: detail panel — notes, checklist, links, history */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <StickyNote className="size-3" /> Notes
              </p>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-white/10 bg-background/40 px-2 py-1.5 text-sm"
                placeholder="Notes about this task…"
                value={parsed.text}
                onChange={(e) => serializeNotes(e.target.value, parsed.items)}
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <ListChecks className="size-3" /> Checklist
              </p>
              {parsed.items.length === 0 && <p className="text-[11px] text-muted-foreground/70">No sub-items yet.</p>}
              <div className="space-y-1">
                {parsed.items.map((it, i) => (
                  <div key={i} className="group flex items-center gap-2">
                    <Checkbox checked={it.done} onCheckedChange={(v) => updateChecklist(i, Boolean(v))} />
                    <span className={`flex-1 text-sm ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.text}</span>
                    <button onClick={() => removeChecklist(i)} className="opacity-0 group-hover:opacity-100">
                      <X className="size-3 text-muted-foreground hover:text-warning" />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addChecklist(); }} className="mt-2 flex gap-1">
                <Input placeholder="Add sub-item…" value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" type="submit" disabled={!newChecklist.trim()}><Plus className="size-3" /></Button>
              </form>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Link2 className="size-3" /> Linked resources
              </p>
              <div className="space-y-1.5 text-xs">
                {sourceMeta && (
                  <div className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
                    <span className="flex items-center gap-1.5"><sourceMeta.icon className={`size-3.5 ${sourceMeta.color}`} /> Source</span>
                    <Link to={sourceMeta.to} className="text-primary hover:underline">{sourceMeta.label} →</Link>
                  </div>
                )}
                {linkedFood && (
                  <div className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
                    <span>Food</span>
                    <Link to="/foods" className="text-primary hover:underline">{linkedFood.name} →</Link>
                  </div>
                )}
                {linkedProject && (
                  <div className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: linkedProject.color ?? "#94a3b8" }} /> Project
                    </span>
                    <span className="text-muted-foreground">{linkedProject.name}</span>
                  </div>
                )}
                {!sourceMeta && !linkedFood && !linkedProject && (
                  <p className="text-[11px] text-muted-foreground/70">No linked items.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Paperclip className="size-3" /> Attachments
              </p>
              <p className="text-[11px] text-muted-foreground/70">Coming with Vault integration.</p>
            </div>

            {initial?.id && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <History className="size-3" /> History
                </p>
                <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                  {initial?.created_at && <li>Created · {new Date(initial.created_at).toLocaleString()}</li>}
                  {initial?.updated_at && <li>Updated · {new Date(initial.updated_at).toLocaleString()}</li>}
                  {initial?.completed_at && <li className="text-success">Completed · {new Date(initial.completed_at).toLocaleString()}</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recurEnabled} onCheckedChange={(v) => setRecurEnabled(Boolean(v))} />
            <Repeat className="size-3.5" /> Recurring task
          </label>
          {recurEnabled && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Field label="Every">
                <Input type="number" min={1} value={rule.every} onChange={(e) => setRule({ ...rule, every: Math.max(1, Number(e.target.value)) })} />
              </Field>
              <Field label="Unit">
                <Select value={rule.unit} onValueChange={(v) => setRule({ ...rule, unit: v as RecurrenceRule["unit"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">days</SelectItem>
                    <SelectItem value="week">weeks</SelectItem>
                    <SelectItem value="month">months</SelectItem>
                    <SelectItem value="year">years</SelectItem>
                    <SelectItem value="mile">miles</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Anchor">
                <Select value={rule.anchor ?? "due"} onValueChange={(v) => setRule({ ...rule, anchor: v as "due" | "completed" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due">From due date</SelectItem>
                    <SelectItem value="completed">From completion</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <p className="col-span-3 text-[11px] text-muted-foreground">
                {rule.unit === "mile"
                  ? "Mile-based tasks don't auto-schedule; log mileage when you complete."
                  : `Next occurrence will spawn ${rule.every} ${rule.unit}${rule.every > 1 ? "s" : ""} after ${rule.anchor === "completed" ? "you complete it" : "the due date"}.`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDialog({
  open, initial, onClose, onSave,
}: {
  open: boolean;
  initial: Partial<Project> | null;
  onClose: () => void;
  onSave: (p: Partial<Project> & { name: string }) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Project>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel">
        <DialogHeader><DialogTitle>{initial?.id ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description">
            <textarea
              className="min-h-[70px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color">
              <Input type="color" value={form.color ?? "#38bdf8"} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => form.name && onSave(form as any)} disabled={!form.name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
