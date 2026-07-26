import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pin, PinOff, Trash2, X, Archive, Tag as TagIcon } from "lucide-react";
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
  useVaultEntries, useUpsertVaultEntry, useDeleteVaultEntry,
  type VaultEntry,
} from "@/lib/atlas-data";
import {
  VAULT_TEMPLATES, templateByKey,
  type VaultTemplate, type VaultFieldDef,
} from "@/lib/vault-templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Knowledge Vault — Atlas" },
      { name: "description", content: "Template-driven memory: vehicles, home, camping loadouts, warranties, contacts, and playbooks — searchable and cross-linked." },
    ],
  }),
  component: VaultPage,
});

type ViewKey = "all" | "pinned" | string;

function VaultPage() {
  const entries = useVaultEntries();
  const upsert = useUpsertVaultEntry();
  const del = useDeleteVaultEntry();

  const [view, setView] = useState<ViewKey>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ entry: Partial<VaultEntry>; template: VaultTemplate } | null>(null);

  const all = entries.data ?? [];

  const countsByTemplate = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of all) m.set(e.template, (m.get(e.template) ?? 0) + 1);
    return m;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (view === "pinned") list = list.filter((e) => e.is_pinned);
    else if (view !== "all") list = list.filter((e) => e.template === view);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        if (e.title.toLowerCase().includes(q)) return true;
        if (e.subtitle?.toLowerCase().includes(q)) return true;
        if (e.notes?.toLowerCase().includes(q)) return true;
        if (e.tags.some((t) => t.toLowerCase().includes(q))) return true;
        const fields = e.fields as Record<string, unknown>;
        return Object.values(fields).some((v) =>
          typeof v === "string" && v.toLowerCase().includes(q),
        );
      });
    }
    return list;
  }, [all, view, query]);

  function openNew(tmpl: VaultTemplate) {
    setEditing({
      entry: { template: tmpl.key, title: "", fields: {}, tags: [] },
      template: tmpl,
    });
  }

  function openEdit(entry: VaultEntry) {
    setEditing({ entry, template: templateByKey(entry.template) });
  }

  async function togglePin(entry: VaultEntry) {
    await upsert.mutateAsync({ id: entry.id, template: entry.template, title: entry.title, is_pinned: !entry.is_pinned });
  }

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <GlassCard className="h-fit lg:sticky lg:top-6">
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Knowledge Vault
          </p>
          <h2 className="text-xl font-semibold">Templates</h2>
        </div>

        <nav className="space-y-1">
          <SidebarItem
            active={view === "all"}
            onClick={() => setView("all")}
            label="All entries"
            count={all.length}
          />
          <SidebarItem
            active={view === "pinned"}
            onClick={() => setView("pinned")}
            label="Pinned"
            count={all.filter((e) => e.is_pinned).length}
            icon={<Pin className="size-4" />}
          />
          <div className="mt-3 mb-1 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Categories
          </div>
          {VAULT_TEMPLATES.map((t) => (
            <SidebarItem
              key={t.key}
              active={view === t.key}
              onClick={() => setView(t.key)}
              label={t.plural}
              count={countsByTemplate.get(t.key) ?? 0}
              icon={<t.icon className={cn("size-4", t.accent)} />}
            />
          ))}
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
                {view === "all" ? "All entries" : view === "pinned" ? "Pinned" : templateByKey(view).plural}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {view === "all" || view === "pinned"
                  ? "Structured memory for the things you look up more than once."
                  : templateByKey(view).description}
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
              <Button
                onClick={() => openNew(view === "all" || view === "pinned" ? VAULT_TEMPLATES[0] : templateByKey(view))}
                className="gap-2"
              >
                <Plus className="size-4" /> New entry
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Template picker rail (only shown on All/Pinned) */}
        {(view === "all" || view === "pinned") && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VAULT_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => openNew(t)}
                className="glass-panel group flex items-start gap-3 rounded-2xl border border-white/5 p-4 text-left transition-all hover:border-white/15 hover:bg-white/5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <t.icon className={cn("size-5", t.accent)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">New {t.label}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Entry grid */}
        {filtered.length === 0 ? (
          <GlassCard className="text-center">
            <Archive className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {query ? "No entries match your search." : "Nothing here yet — start with a template above."}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
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

function EntryCard({
  entry, onOpen, onTogglePin, onDelete,
}: {
  entry: VaultEntry;
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
              {tmpl.label}
            </p>
            <h3 className="truncate text-base font-semibold">{entry.title}</h3>
            {entry.subtitle && (
              <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>
            )}
          </div>
        </div>
        <div className="relative flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onTogglePin}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            title={entry.is_pinned ? "Unpin" : "Pin"}
          >
            {entry.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${entry.title}"?`)) onDelete();
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            title="Delete"
          >
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

      {entry.tags.length > 0 && (
        <div className="relative flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 text-[10px]">
              <TagIcon className="size-2.5" />
              {t}
            </Badge>
          ))}
        </div>
      )}

      {entry.is_pinned && (
        <Pin className="pointer-events-none absolute right-3 top-3 size-3 text-primary opacity-100 group-hover:opacity-0" />
      )}
    </article>
  );
}

function EntryDialog({
  entry, template, onClose, onSave,
}: {
  entry: Partial<VaultEntry>;
  template: VaultTemplate;
  onClose: () => void;
  onSave: (payload: Partial<VaultEntry> & { title: string; template: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [subtitle, setSubtitle] = useState(entry.subtitle ?? "");
  const [fields, setFields] = useState<Record<string, unknown>>(
    (entry.fields as Record<string, unknown>) ?? {},
  );
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [tagsInput, setTagsInput] = useState((entry.tags ?? []).join(", "));

  const Icon = template.icon;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("size-5", template.accent)} />
            {entry.id ? "Edit" : "New"} {template.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={template.titleHint ?? "Give it a memorable name"}
              autoFocus
            />
          </div>

          <div>
            <Label>Subtitle <span className="text-muted-foreground">· optional</span></Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Short context line shown in the card"
            />
          </div>

          {template.fields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {template.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={fields[field.key]}
                  onChange={(v) => setFields((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything else worth remembering"
            />
          </div>

          <div>
            <Label>Tags <span className="text-muted-foreground">· comma separated</span></Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="daily-driver, insured, garage-A"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
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
                fields: pruneEmpty(fields),
                notes: notes.trim() || null,
                tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
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
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  if (field.type === "list") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="sm:col-span-2">
        {common}
        <Textarea
          value={arr.join("\n")}
          onChange={(e) =>
            onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
          }
          rows={4}
          placeholder={field.placeholder ?? "One item per line"}
        />
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

function pruneEmpty(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}
