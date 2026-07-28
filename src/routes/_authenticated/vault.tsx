import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Search, Pin, PinOff, Trash2, X, Archive, Tag as TagIcon,
  Bell, Link2, Paperclip, FileText as FileIcon, ChevronRight,
  Home, Car, Plane, Wallet, Tent, BookMarked, Inbox, Clock,
  ExternalLink,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useVaultEntries, useUpsertVaultEntry, useDeleteVaultEntry,
  useVaultTags, useVaultReminders, useUpsertVaultReminder, useDeleteVaultReminder,
  computeNextFireOn,
  type VaultEntry, type VaultReminder,
} from "@/lib/atlas-data";
import {
  VAULT_TEMPLATES, VAULT_AREAS, templateByKey, dateFieldsOf,
  type VaultTemplate, type VaultFieldDef, type VaultArea,
} from "@/lib/vault-templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Knowledge Vault — Atlas" },
      { name: "description", content: "Atlas' long-term memory: connected records for home, vehicles, travel, and reference — searchable, cross-linked, and reminder-driven." },
    ],
  }),
  component: VaultPage,
});

type ViewKey = "all" | "pinned" | "reminders" | VaultArea;

const AREA_META: Record<VaultArea, { label: string; icon: typeof Home; accent: string }> = {
  home:      { label: "Home",      icon: Home,       accent: "text-amber-300" },
  vehicles:  { label: "Vehicles",  icon: Car,        accent: "text-sky-300" },
  travel:    { label: "Travel",    icon: Plane,      accent: "text-fuchsia-300" },
  finance:   { label: "Finance",   icon: Wallet,     accent: "text-emerald-300" },
  outdoor:   { label: "Outdoor",   icon: Tent,       accent: "text-green-300" },
  reference: { label: "Reference", icon: BookMarked, accent: "text-violet-300" },
  unfiled:   { label: "Unfiled",   icon: Inbox,      accent: "text-slate-300" },
};

function VaultPage() {
  const entries = useVaultEntries();
  const reminders = useVaultReminders();
  const tags = useVaultTags();
  const upsert = useUpsertVaultEntry();
  const del = useDeleteVaultEntry();

  const [view, setView] = useState<ViewKey>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ entry: Partial<VaultEntry>; template: VaultTemplate } | null>(null);

  const all = entries.data ?? [];
  const entriesById = useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);

  const countsByArea = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of all) m.set(e.area, (m.get(e.area) ?? 0) + 1);
    return m;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (view === "pinned") list = list.filter((e) => e.is_pinned);
    else if (view !== "all" && view !== "reminders") list = list.filter((e) => e.area === view);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        if (e.title.toLowerCase().includes(q)) return true;
        if (e.subtitle?.toLowerCase().includes(q)) return true;
        if (e.notes?.toLowerCase().includes(q)) return true;
        if (e.tags.some((t) => t.toLowerCase().includes(q))) return true;
        if (e.area.includes(q)) return true;
        const fields = e.fields as Record<string, unknown>;
        return Object.values(fields).some((v) =>
          typeof v === "string" && v.toLowerCase().includes(q),
        );
      });
    }
    return list;
  }, [all, view, query]);

  const upcomingReminders = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    return (reminders.data ?? [])
      .filter((r) => r.active && r.next_fire_on)
      .filter((r) => {
        const d = new Date(r.next_fire_on! + "T00:00:00");
        return d >= now && d <= in30;
      })
      .sort((a, b) => (a.next_fire_on! < b.next_fire_on! ? -1 : 1));
  }, [reminders.data]);

  const recentlyUpdated = useMemo(
    () => [...all].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 6),
    [all],
  );
  const pinnedEntries = useMemo(() => all.filter((e) => e.is_pinned).slice(0, 6), [all]);

  function openNew(tmpl: VaultTemplate, presetParent?: string) {
    setEditing({
      entry: {
        template: tmpl.key,
        title: "",
        fields: {},
        tags: [],
        area: tmpl.defaultArea,
        parent_id: presetParent ?? null,
        attachments: [] as never,
      },
      template: tmpl,
    });
  }
  function openEdit(entry: VaultEntry) {
    setEditing({ entry, template: templateByKey(entry.template) });
  }
  async function togglePin(entry: VaultEntry) {
    await upsert.mutateAsync({
      id: entry.id, template: entry.template, title: entry.title, is_pinned: !entry.is_pinned,
    });
  }

  const isLanding = view === "all" && !query.trim();

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <GlassCard className="h-fit lg:sticky lg:top-6">
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Knowledge Vault
          </p>
          <h2 className="text-xl font-semibold">Atlas Memory</h2>
        </div>

        <nav className="space-y-1">
          <SidebarItem active={view === "all"} onClick={() => setView("all")}
            label="All entries" count={all.length} icon={<BookMarked className="size-4" />} />
          <SidebarItem active={view === "pinned"} onClick={() => setView("pinned")}
            label="Pinned" count={all.filter((e) => e.is_pinned).length}
            icon={<Pin className="size-4" />} />
          <SidebarItem active={view === "reminders"} onClick={() => setView("reminders")}
            label="Reminders" count={upcomingReminders.length}
            icon={<Bell className="size-4" />} />

          <div className="mt-3 mb-1 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Areas
          </div>
          {VAULT_AREAS.filter((a) => a.key !== "unfiled").map((a) => {
            const meta = AREA_META[a.key];
            return (
              <SidebarItem
                key={a.key}
                active={view === a.key}
                onClick={() => setView(a.key)}
                label={meta.label}
                count={countsByArea.get(a.key) ?? 0}
                icon={<meta.icon className={cn("size-4", meta.accent)} />}
              />
            );
          })}

          <div className="mt-3 mb-1 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Inbox
          </div>
          <SidebarItem active={view === "unfiled"} onClick={() => setView("unfiled")}
            label="Unfiled" count={countsByArea.get("unfiled") ?? 0}
            icon={<Inbox className="size-4 text-slate-300" />} />
        </nav>
      </GlassCard>

      {/* Main */}
      <div className="space-y-6">
        <GlassCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Atlas Vault
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {viewTitle(view)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {viewSubtitle(view)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Vault…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-64 pl-9"
                />
              </div>
              <NewEntryButton onPick={openNew} />
            </div>
          </div>
        </GlassCard>

        {view === "reminders" ? (
          <RemindersView
            reminders={reminders.data ?? []}
            entries={entriesById}
            onOpenEntry={openEdit}
          />
        ) : isLanding ? (
          <LandingView
            pinned={pinnedEntries}
            recent={recentlyUpdated}
            upcoming={upcomingReminders}
            entriesById={entriesById}
            onOpenEntry={openEdit}
            onTogglePin={togglePin}
            onDelete={(id) => del.mutate(id)}
          />
        ) : filtered.length === 0 ? (
          <GlassCard className="text-center">
            <Archive className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {query
                ? "No entries match your search."
                : "Nothing here yet — use “+ New Entry” to add one."}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                parent={entry.parent_id ? entriesById.get(entry.parent_id) ?? null : null}
                reminderCount={
                  (reminders.data ?? []).filter((r) => r.entry_id === entry.id && r.active).length
                }
                onOpen={() => openEdit(entry)}
                onTogglePin={() => togglePin(entry)}
                onDelete={() => del.mutate(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EntryDialog
          entry={editing.entry}
          template={editing.template}
          allEntries={all}
          allTags={(tags.data ?? []).map((t) => t.name)}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await upsert.mutateAsync(payload);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function viewTitle(v: ViewKey) {
  if (v === "all") return "All entries";
  if (v === "pinned") return "Pinned";
  if (v === "reminders") return "Reminders";
  return AREA_META[v as VaultArea].label;
}
function viewSubtitle(v: ViewKey) {
  if (v === "all") return "Structured memory for the things you look up more than once.";
  if (v === "pinned") return "Everything you told Atlas to keep close.";
  if (v === "reminders") return "Vault dates that will generate tasks in Atlas.";
  return VAULT_AREAS.find((a) => a.key === v)?.description ?? "";
}

/* ------------------------------ Sidebar row ------------------------------ */

function SidebarItem({
  active, onClick, label, count, icon,
}: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
        active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
    >
      {icon ?? <span className="size-4" />}
      <span className="flex-1 text-left">{label}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
    </button>
  );
}

/* ------------------------------ New Entry ------------------------------ */

function NewEntryButton({ onPick }: { onPick: (t: VaultTemplate) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="gap-2"><Plus className="size-4" /> New entry</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Choose a template
        </p>
        <div className="space-y-1">
          {VAULT_TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => { onPick(t); setOpen(false); }}
              className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <t.icon className={cn("size-4", t.accent)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="line-clamp-2 text-[11px] text-muted-foreground">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------ Landing ------------------------------ */

function LandingView({
  pinned, recent, upcoming, entriesById, onOpenEntry, onTogglePin, onDelete,
}: {
  pinned: VaultEntry[];
  recent: VaultEntry[];
  upcoming: VaultReminder[];
  entriesById: Map<string, VaultEntry>;
  onOpenEntry: (e: VaultEntry) => void;
  onTogglePin: (e: VaultEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Strip title="Pinned" icon={<Pin className="size-4 text-primary" />}
        empty="Pin entries you look up often — they land here.">
        {pinned.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            parent={e.parent_id ? entriesById.get(e.parent_id) ?? null : null}
            reminderCount={0}
            onOpen={() => onOpenEntry(e)}
            onTogglePin={() => onTogglePin(e)}
            onDelete={() => onDelete(e.id)}
          />
        ))}
      </Strip>

      <Strip title="Recently updated" icon={<Clock className="size-4 text-muted-foreground" />}
        empty="Nothing yet — new and edited entries appear here.">
        {recent.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            parent={e.parent_id ? entriesById.get(e.parent_id) ?? null : null}
            reminderCount={0}
            onOpen={() => onOpenEntry(e)}
            onTogglePin={() => onTogglePin(e)}
            onDelete={() => onDelete(e.id)}
          />
        ))}
      </Strip>

      <Strip title="Upcoming reminders" icon={<Bell className="size-4 text-warning" />}
        empty="No reminders in the next 30 days.">
        {upcoming.slice(0, 6).map((r) => {
          const entry = entriesById.get(r.entry_id);
          if (!entry) return null;
          return (
            <button
              key={r.id}
              onClick={() => onOpenEntry(entry)}
              className="glass-panel flex items-start gap-3 rounded-2xl border border-white/5 p-4 text-left transition-all hover:border-white/15"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-warning/10">
                <Bell className="size-4 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.title} · fires {r.next_fire_on}
                </p>
              </div>
            </button>
          );
        })}
      </Strip>
    </div>
  );
}

function Strip({
  title, icon, empty, children,
}: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      {arr.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

/* ------------------------------ Reminders view ------------------------------ */

function RemindersView({
  reminders, entries, onOpenEntry,
}: {
  reminders: VaultReminder[];
  entries: Map<string, VaultEntry>;
  onOpenEntry: (e: VaultEntry) => void;
}) {
  const active = reminders.filter((r) => r.active).sort((a, b) =>
    (a.next_fire_on ?? "z") < (b.next_fire_on ?? "z") ? -1 : 1,
  );
  if (active.length === 0) {
    return (
      <GlassCard className="text-center">
        <Bell className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No active reminders yet. Open a Vault entry with a date field to add one.
        </p>
      </GlassCard>
    );
  }
  return (
    <GlassCard>
      <ul className="divide-y divide-white/5">
        {active.map((r) => {
          const entry = entries.get(r.entry_id);
          return (
            <li key={r.id} className="flex items-center gap-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-warning/10">
                <Bell className="size-4 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry?.title ?? "Entry removed"} ·{" "}
                  {r.next_fire_on ? `fires ${r.next_fire_on}` : "waiting on date"} ·{" "}
                  {r.repeat === "none" ? "one-off" : `repeats ${r.repeat}`}
                </p>
              </div>
              {entry && (
                <Button size="sm" variant="ghost" onClick={() => onOpenEntry(entry)} className="gap-1">
                  Open <ChevronRight className="size-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

/* ------------------------------ Card ------------------------------ */

function EntryCard({
  entry, parent, reminderCount, onOpen, onTogglePin, onDelete,
}: {
  entry: VaultEntry;
  parent: VaultEntry | null;
  reminderCount: number;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const tmpl = templateByKey(entry.template);
  const Icon = tmpl.icon;
  const fields = entry.fields as Record<string, unknown>;
  const preview = tmpl.fields
    .map((f) => ({ f, v: fields[f.key] }))
    .filter(({ v }) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .slice(0, 3);

  const linkedCount =
    ((entry.related_task_ids as string[])?.length ?? 0) +
    ((entry.related_trip_ids as string[])?.length ?? 0) +
    (entry.related_project_id ? 1 : 0);

  return (
    <article className="glass-panel group relative flex flex-col gap-3 rounded-2xl border border-white/5 p-5 transition-all hover:border-white/15">
      <button onClick={onOpen} className="absolute inset-0" aria-label={`Open ${entry.title}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Icon className={cn("size-4", tmpl.accent)} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {tmpl.label} · {AREA_META[(entry.area as VaultArea) ?? "unfiled"].label}
            </p>
            <h3 className="truncate text-base font-semibold">{entry.title}</h3>
            {parent && (
              <p className="truncate text-[11px] text-muted-foreground">↳ {parent.title}</p>
            )}
            {entry.subtitle && (
              <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>
            )}
          </div>
        </div>
        <div className="relative flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onTogglePin}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            title={entry.is_pinned ? "Unpin" : "Pin"}>
            {entry.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </button>
          <button onClick={() => { if (confirm(`Delete "${entry.title}"?`)) onDelete(); }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            title="Delete">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <dl className="relative space-y-1 text-xs">
          {preview.map(({ f, v }) => (
            <div key={f.key} className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">{f.label}</dt>
              <dd className="min-w-0 flex-1 truncate">
                {Array.isArray(v) ? `${v.length} items` : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {entry.notes && (
        <p className="relative line-clamp-2 text-xs text-muted-foreground">{entry.notes}</p>
      )}

      {(entry.tags.length > 0 || reminderCount > 0 || linkedCount > 0) && (
        <div className="relative flex flex-wrap items-center gap-1.5">
          {entry.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 text-[10px]">
              <TagIcon className="size-2.5" />{t}
            </Badge>
          ))}
          {reminderCount > 0 && (
            <Badge variant="outline" className="gap-1 border-warning/40 text-[10px] text-warning">
              <Bell className="size-2.5" />{reminderCount}
            </Badge>
          )}
          {linkedCount > 0 && (
            <Badge variant="outline" className="gap-1 border-white/15 text-[10px] text-muted-foreground">
              <Link2 className="size-2.5" />{linkedCount}
            </Badge>
          )}
        </div>
      )}

      {entry.is_pinned && (
        <Pin className="pointer-events-none absolute right-3 top-3 size-3 text-primary opacity-100 group-hover:opacity-0" />
      )}
    </article>
  );
}

/* ------------------------------ Entry Dialog ------------------------------ */

function EntryDialog({
  entry, template, allEntries, allTags, onClose, onSave,
}: {
  entry: Partial<VaultEntry>;
  template: VaultTemplate;
  allEntries: VaultEntry[];
  allTags: string[];
  onClose: () => void;
  onSave: (payload: Partial<VaultEntry> & { title: string; template: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [subtitle, setSubtitle] = useState(entry.subtitle ?? "");
  const [area, setArea] = useState<VaultArea>((entry.area as VaultArea) ?? template.defaultArea);
  const [parentId, setParentId] = useState<string | null>(entry.parent_id ?? null);
  const [fields, setFields] = useState<Record<string, unknown>>(
    (entry.fields as Record<string, unknown>) ?? {},
  );
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [tags, setTags] = useState<string[]>(entry.tags ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(
    ((entry.attachments as unknown) as Attachment[]) ?? [],
  );

  const Icon = template.icon;
  const parentCandidates = useMemo(
    () => allEntries.filter((e) => (e.template === "vehicle" || e.template === "home") && e.id !== entry.id),
    [allEntries, entry.id],
  );
  const attachDefault = template.attachByDefault === true;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-white/5 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("size-5", template.accent)} />
            {entry.id ? "Edit" : "New"} {template.label}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex flex-col">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details" disabled={template.fields.length === 0}>Details</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
            <TabsTrigger value="reminders" disabled={!entry.id || dateFieldsOf(template).length === 0}>
              Reminders
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={template.titleHint ?? "Give it a memorable name"} autoFocus />
              </div>
              <div>
                <Label>Subtitle <span className="text-muted-foreground">· optional</span></Label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Short context line shown in the card" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Area</Label>
                  <Select value={area} onValueChange={(v) => setArea(v as VaultArea)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VAULT_AREAS.map((a) => (
                        <SelectItem key={a.key} value={a.key}>{AREA_META[a.key].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(attachDefault || parentCandidates.length > 0) && (
                  <div>
                    <Label>
                      Attach to asset
                      {attachDefault && <span className="ml-1 text-muted-foreground">· recommended</span>}
                    </Label>
                    <Select
                      value={parentId ?? "none"}
                      onValueChange={(v) => setParentId(v === "none" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Standalone" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Save as standalone</SelectItem>
                        {parentCandidates.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label>Tags</Label>
                <TagChipInput value={tags} onChange={setTags} suggestions={allTags} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Anything else worth remembering" />
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              {template.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">This template has no structured fields.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {template.fields.map((field) => (
                    <FieldInput key={field.key} field={field} value={fields[field.key]}
                      onChange={(v) => setFields((prev) => ({ ...prev, [field.key]: v }))} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-0">
              <AttachmentEditor value={attachments} onChange={setAttachments} />
            </TabsContent>

            <TabsContent value="related" className="mt-0 space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">
                Vault entries reference other Atlas data — parent asset above sets the primary link.
                Task and Trip links are managed from those modules and shown here as counts.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <StatChip icon={<Link2 className="size-3.5" />} label="Linked tasks"
                  value={(entry.related_task_ids as string[] | undefined)?.length ?? 0} />
                <StatChip icon={<Plane className="size-3.5" />} label="Linked trips"
                  value={(entry.related_trip_ids as string[] | undefined)?.length ?? 0} />
                <StatChip icon={<FileIcon className="size-3.5" />} label="Attachments"
                  value={attachments.length} />
              </div>
              {parentId && (
                <p className="text-xs text-muted-foreground">
                  Attached to <span className="text-foreground">
                    {allEntries.find((e) => e.id === parentId)?.title ?? "…"}
                  </span>
                </p>
              )}
            </TabsContent>

            <TabsContent value="reminders" className="mt-0">
              {entry.id ? (
                <ReminderSection
                  entryId={entry.id}
                  template={template}
                  fields={fields}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Save the entry first, then add reminders.</p>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2 border-t border-white/5 px-6 py-4 sm:justify-between">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <X className="size-4" /> Cancel
          </Button>
          <Button
            disabled={!title.trim()}
            onClick={() =>
              onSave({
                ...(entry.id ? { id: entry.id } : {}),
                template: template.key,
                title: title.trim(),
                subtitle: subtitle.trim() || null,
                area,
                parent_id: parentId,
                fields: pruneEmpty(fields) as never,
                notes: notes.trim() || null,
                tags,
                attachments: attachments as never,
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

/* ------------------------------ Reminders section ------------------------------ */

function ReminderSection({
  entryId, template, fields,
}: { entryId: string; template: VaultTemplate; fields: Record<string, unknown> }) {
  const reminders = useVaultReminders(entryId);
  const upsert = useUpsertVaultReminder();
  const del = useDeleteVaultReminder();
  const dateFields = dateFieldsOf(template);
  const [newFieldKey, setNewFieldKey] = useState<string>(dateFields[0]?.key ?? "");
  const [newLead, setNewLead] = useState(30);
  const [newRepeat, setNewRepeat] = useState<"none" | "yearly" | "monthly">("yearly");
  const [newLabel, setNewLabel] = useState("");

  async function add() {
    const field = dateFields.find((f) => f.key === newFieldKey);
    if (!field) return;
    const sourceDate = (fields[field.key] as string | undefined) ?? null;
    if (!sourceDate) {
      alert(`Set a value for "${field.label}" in Details first, then save the entry.`);
      return;
    }
    await upsert.mutateAsync({
      entry_id: entryId,
      label: newLabel.trim() || `Renew: ${field.label}`,
      field_key: field.key,
      lead_days: newLead,
      repeat: newRepeat,
      source_date: sourceDate,
      trigger_kind: "date",
      active: true,
    });
    setNewLabel("");
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground">
        Reminders read a date from this entry and generate a Task in Atlas ahead of time.
        The Vault date remains the source of truth — Atlas never edits it back.
      </p>

      {dateFields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-muted-foreground">
          This template has no date fields yet.
        </p>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            New reminder
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Watch date</Label>
              <Select value={newFieldKey} onValueChange={setNewFieldKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dateFields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lead time (days)</Label>
              <Input type="number" min={0} value={newLead}
                onChange={(e) => setNewLead(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Repeat</Label>
              <Select value={newRepeat} onValueChange={(v) => setNewRepeat(v as typeof newRepeat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-off</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Renew registration" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {(() => {
                const key = newFieldKey;
                const src = fields[key] as string | undefined;
                const next = computeNextFireOn(src ?? null, newLead, newRepeat);
                return src && next
                  ? `Would fire on ${next} (source date ${src})`
                  : "Fill the date in Details to preview the fire date.";
              })()}
            </p>
            <Button size="sm" onClick={add} className="gap-1">
              <Plus className="size-3.5" /> Add reminder
            </Button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {(reminders.data ?? []).map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <Bell className="size-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.next_fire_on ? `fires ${r.next_fire_on}` : "waiting on date"} ·{" "}
                lead {r.lead_days}d · {r.repeat === "none" ? "one-off" : `repeats ${r.repeat}`}
                {r.last_generated_task_id && " · task created"}
              </p>
            </div>
            <button onClick={() => del.mutate(r.id)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ Field input ------------------------------ */

function FieldInput({
  field, value, onChange,
}: {
  field: VaultFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const common = (
    <Label className="text-xs text-muted-foreground">
      {field.label}
      {field.hint && <span className="ml-1 opacity-70">· {field.hint}</span>}
    </Label>
  );

  if (field.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        {common}
        <Textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}
          rows={3} placeholder={field.placeholder} />
      </div>
    );
  }

  if (field.type === "list") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="sm:col-span-2">
        {common}
        <Textarea value={arr.join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          rows={4} placeholder={field.placeholder ?? "One item per line"} />
      </div>
    );
  }

  return (
    <div>
      {common}
      <Input
        type={
          field.type === "number" ? "number" :
          field.type === "date" ? "date" :
          field.type === "url" ? "url" : "text"
        }
        value={(value as string | number | undefined) ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(field.type === "number" ? (v === "" ? null : Number(v)) : v);
        }}
        placeholder={field.placeholder}
      />
    </div>
  );
}

/* ------------------------------ Tag chips ------------------------------ */

function TagChipInput({
  value, onChange, suggestions,
}: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [input, setInput] = useState("");
  const filtered = suggestions
    .filter((s) => !value.includes(s) && (input.trim() === "" || s.includes(input.trim().toLowerCase())))
    .slice(0, 6);
  function add(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t || value.includes(t)) { setInput(""); return; }
    onChange([...value, t]);
    setInput("");
  }
  return (
    <div className="rounded-md border border-input bg-transparent p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 text-[10px]">
            <TagIcon className="size-2.5" />{t}
            <button onClick={() => onChange(value.filter((x) => x !== t))}
              className="ml-1 text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
            else if (e.key === "Backspace" && !input && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length === 0 ? "Type and press Enter" : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {filtered.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-white/5 pt-2">
          {filtered.map((s) => (
            <button key={s} onClick={() => add(s)}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-white/30 hover:text-foreground">
              +{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Attachments ------------------------------ */

type Attachment = { label: string; url: string; kind: string };

function AttachmentEditor({
  value, onChange,
}: { value: Attachment[]; onChange: (v: Attachment[]) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("link");
  function add() {
    if (!url.trim()) return;
    onChange([...value, { label: label.trim() || url.trim(), url: url.trim(), kind }]);
    setLabel(""); setUrl(""); setKind("link");
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Store links to receipts, manuals, photos, and cloud files. Real uploads come later.
      </p>
      <ul className="space-y-2">
        {value.map((a, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.label}</p>
              <a href={a.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 truncate text-xs text-primary hover:underline">
                {a.url} <ExternalLink className="size-3" />
              </a>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
              {a.kind}
            </span>
            <button onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_120px]">
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={add} className="gap-1" disabled={!url.trim()}>
            <Plus className="size-3.5" /> Add attachment
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Utilities ------------------------------ */

function pruneEmpty(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}
