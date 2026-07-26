import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Cake, Heart,
  Plane, Flag, Sparkles, CheckSquare,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useTasks, useUpsertTask,
  usePersonalDates, useUpsertPersonalDate, useDeletePersonalDate,
  personalDateOccurrenceIn, daysUntil,
  type Task, type PersonalDate,
} from "@/lib/atlas-data";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Atlas" },
      { name: "description", content: "Your month at a glance — tasks with due dates, birthdays, anniversaries, and vacation countdowns, all in one calendar." },
    ],
  }),
  component: CalendarPage,
});

type View = "month" | "week" | "day";

const KIND_META: Record<PersonalDate["kind"], { label: string; Icon: typeof Cake; color: string }> = {
  birthday:    { label: "Birthday",    Icon: Cake,     color: "text-pink-400" },
  anniversary: { label: "Anniversary", Icon: Heart,    color: "text-rose-400" },
  holiday:     { label: "Holiday",     Icon: Flag,     color: "text-amber-400" },
  vacation:    { label: "Vacation",    Icon: Plane,    color: "text-sky-400" },
  countdown:   { label: "Countdown",   Icon: Sparkles, color: "text-violet-400" },
  other:       { label: "Other",       Icon: CalendarDays, color: "text-muted-foreground" },
};

const ymd = (d: Date) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const parseYmd = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type DayEntry =
  | { kind: "task"; id: string; title: string; task: Task }
  | { kind: "date"; id: string; title: string; pd: PersonalDate };

function CalendarPage() {
  const tasks = useTasks();
  const upsertTask = useUpsertTask();
  const dates = usePersonalDates();
  const upsertDate = useUpsertPersonalDate();
  const deleteDate = useDeletePersonalDate();

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [selected, setSelected] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [dialog, setDialog] = useState<Partial<PersonalDate> | null>(null);

  // Build a map: YYYY-MM-DD → entries. Personal dates are expanded per year.
  const entriesByDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    const push = (key: string, e: DayEntry) => {
      const arr = map.get(key) ?? []; arr.push(e); map.set(key, arr);
    };
    (tasks.data ?? []).forEach((t) => {
      if (!t.due_on || t.is_done) return;
      push(t.due_on, { kind: "task", id: t.id, title: t.title, task: t });
    });
    // Expand personal dates across the years currently visible (cursor year ±1)
    const years = new Set([cursor.getFullYear() - 1, cursor.getFullYear(), cursor.getFullYear() + 1]);
    (dates.data ?? []).forEach((pd) => {
      if (pd.is_recurring) {
        years.forEach((y) => push(personalDateOccurrenceIn(pd, y), { kind: "date", id: pd.id, title: pd.name, pd }));
      } else {
        push(pd.on_date, { kind: "date", id: pd.id, title: pd.name, pd });
      }
    });
    return map;
  }, [tasks.data, dates.data, cursor]);

  const monthCells = useMemo(() => {
    if (view !== "month") return [];
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [cursor, view]);

  const weekCells = useMemo(() => {
    const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  // Upcoming (next 30 days)
  const upcoming = useMemo(() => {
    const out: { date: Date; entry: DayEntry }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
      const list = entriesByDay.get(ymd(d)) ?? [];
      list.forEach((e) => out.push({ date: d, entry: e }));
    }
    return out;
  }, [entriesByDay]);

  const todayEntries = entriesByDay.get(ymd(new Date())) ?? [];
  const selectedEntries = entriesByDay.get(ymd(selected)) ?? [];

  const monthTitle = cursor.toLocaleString("default", { month: "long", year: "numeric" });
  const weekTitle = `${weekCells[0]?.toLocaleString("default", { month: "short", day: "numeric" })} – ${weekCells[6]?.toLocaleString("default", { month: "short", day: "numeric", year: "numeric" })}`;
  const dayTitle = cursor.toLocaleString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function shift(dir: -1 | 1) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  }
  function goToday() { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d); setSelected(d); }

  return (
    <div className="space-y-6 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Atlas / Calendar</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {view === "month" ? monthTitle : view === "week" ? weekTitle : dayTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks with due dates appear here automatically. Birthdays, anniversaries, and countdowns live in Personal Dates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-white/10">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider ${view === v ? "bg-white/15 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
              >{v}</button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
          <Button size="sm" onClick={() => setDialog({ kind: "birthday", is_recurring: true, on_date: ymd(selected) })}>
            <Plus className="mr-1 size-4" /> Personal date
          </Button>
        </div>
      </header>

      {/* Today strip */}
      <GlassCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Today's Agenda</p>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on the calendar today. Systems nominal.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {todayEntries.map((e) => <EntryChip key={`${e.kind}-${e.id}`} entry={e} />)}
          </div>
        )}
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <GlassCard className="p-4">
          {view === "month" && (
            <MonthGrid
              cursor={cursor}
              cells={monthCells}
              selected={selected}
              setSelected={setSelected}
              entriesByDay={entriesByDay}
            />
          )}
          {view === "week" && (
            <WeekGrid cells={weekCells} selected={selected} setSelected={setSelected} entriesByDay={entriesByDay} />
          )}
          {view === "day" && (
            <DayView
              date={cursor}
              entries={entriesByDay.get(ymd(cursor)) ?? []}
              onToggleTask={(t) => upsertTask.mutate({ id: t.id, is_done: !t.is_done, title: t.title })}
            />
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {sameDay(selected, new Date()) ? "Selected · Today" : "Selected"}
            </p>
            <p className="mb-3 text-sm font-medium">{selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            {selectedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEntries.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm">
                    <EntryIcon entry={e} />
                    <span className="flex-1 truncate">{e.title}</span>
                    {e.kind === "date" && (
                      <button
                        onClick={() => deleteDate.mutate(e.pd.id)}
                        className="text-muted-foreground transition hover:text-destructive"
                      ><Trash2 className="size-3.5" /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Coming up · 30 days</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Quiet month ahead.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 12).map(({ date, entry }, i) => {
                  const d = daysUntil(ymd(date));
                  return (
                    <li key={`${entry.kind}-${entry.id}-${i}`} className="flex items-center gap-2 text-sm">
                      <EntryIcon entry={entry} />
                      <span className="flex-1 truncate">{entry.title}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {d === 0 ? "today" : d === 1 ? "tmrw" : `${d}d`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>

      <PersonalDateDialog
        open={!!dialog}
        initial={dialog}
        onClose={() => setDialog(null)}
        onSave={(v) => { upsertDate.mutate(v); setDialog(null); }}
      />
    </div>
  );
}

function EntryIcon({ entry }: { entry: DayEntry }) {
  if (entry.kind === "task") return <CheckSquare className="size-3.5 shrink-0 text-primary" />;
  const { Icon, color } = KIND_META[entry.pd.kind];
  return <Icon className={`size-3.5 shrink-0 ${color}`} />;
}

function EntryChip({ entry }: { entry: DayEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
      <EntryIcon entry={entry} />
      {entry.title}
    </span>
  );
}

function MonthGrid({
  cursor, cells, selected, setSelected, entriesByDay,
}: {
  cursor: Date; cells: Date[]; selected: Date; setSelected: (d: Date) => void;
  entriesByDay: Map<string, DayEntry[]>;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = ymd(d);
          const list = entriesByDay.get(key) ?? [];
          const isCurMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const isSel = sameDay(d, selected);
          return (
            <button
              key={key}
              onClick={() => setSelected(d)}
              className={
                "flex min-h-[92px] flex-col rounded-lg border p-1.5 text-left transition " +
                (isSel ? "border-primary/60 bg-primary/10 " : "border-white/5 hover:border-white/15 hover:bg-white/5 ") +
                (isCurMonth ? "" : "opacity-40")
              }
            >
              <span className={`mb-1 text-xs ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                {d.getDate()}
              </span>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {list.slice(0, 3).map((e) => (
                  <span
                    key={`${e.kind}-${e.id}`}
                    className="flex items-center gap-1 truncate rounded bg-white/10 px-1 py-0.5 text-[10px]"
                  >
                    <EntryIcon entry={e} />
                    <span className="truncate">{e.title}</span>
                  </span>
                ))}
                {list.length > 3 && <span className="text-[10px] text-muted-foreground">+{list.length - 3} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  cells, selected, setSelected, entriesByDay,
}: {
  cells: Date[]; selected: Date; setSelected: (d: Date) => void; entriesByDay: Map<string, DayEntry[]>;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <div className="grid grid-cols-7 gap-2">
      {cells.map((d) => {
        const list = entriesByDay.get(ymd(d)) ?? [];
        const isSel = sameDay(d, selected);
        const isToday = sameDay(d, today);
        return (
          <button
            key={ymd(d)} onClick={() => setSelected(d)}
            className={
              "flex min-h-[220px] flex-col rounded-lg border p-2 text-left transition " +
              (isSel ? "border-primary/60 bg-primary/10 " : "border-white/5 hover:border-white/15 hover:bg-white/5 ")
            }
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {d.toLocaleString("default", { weekday: "short" })}
            </p>
            <p className={`mb-2 text-lg font-semibold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</p>
            <div className="flex flex-1 flex-col gap-1 overflow-hidden">
              {list.map((e) => (
                <span key={`${e.kind}-${e.id}`} className="flex items-center gap-1 truncate rounded bg-white/10 px-1.5 py-1 text-[11px]">
                  <EntryIcon entry={e} />
                  <span className="truncate">{e.title}</span>
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayView({
  date, entries, onToggleTask,
}: { date: Date; entries: DayEntry[]; onToggleTask: (t: Task) => void }) {
  return (
    <div>
      <p className="mb-4 text-lg font-semibold">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
              {e.kind === "task" ? (
                <Checkbox checked={!!e.task.is_done} onCheckedChange={() => onToggleTask(e.task)} />
              ) : (
                <EntryIcon entry={e} />
              )}
              <div className="flex-1">
                <p className="text-sm">{e.title}</p>
                {e.kind === "date" && <p className="text-xs text-muted-foreground">{KIND_META[e.pd.kind].label}{e.pd.is_recurring ? " · recurring" : ""}</p>}
                {e.kind === "task" && e.task.notes && <p className="text-xs text-muted-foreground">{e.task.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PersonalDateDialog({
  open, initial, onClose, onSave,
}: {
  open: boolean;
  initial: Partial<PersonalDate> | null;
  onClose: () => void;
  onSave: (v: Partial<PersonalDate> & { name: string; on_date: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<PersonalDate["kind"]>((initial?.kind as any) ?? "birthday");
  const [onDate, setOnDate] = useState(initial?.on_date ?? ymd(new Date()));
  const [recurring, setRecurring] = useState(initial?.is_recurring ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Reset when opened with new initial values.
  useMemo(() => {
    if (open) {
      setName(initial?.name ?? "");
      setKind((initial?.kind as any) ?? "birthday");
      setOnDate(initial?.on_date ?? ymd(new Date()));
      setRecurring(initial?.is_recurring ?? true);
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add personal date</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mom's birthday" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recurring} onCheckedChange={(v) => setRecurring(!!v)} />
            Repeats annually
          </label>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!name || !onDate} onClick={() => onSave({ name, kind, on_date: onDate, is_recurring: recurring, notes: notes || null })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
