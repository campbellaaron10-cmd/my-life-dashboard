import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Sparkles, Compass } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useBucketList, useUpsertBucket, useDeleteBucket,
  useUpsertTrip, type BucketItem,
} from "@/lib/atlas-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trips/bucket-list")({
  head: () => ({ meta: [{ title: "Bucket List — Atlas" }] }),
  component: BucketListPage,
});

const STATUSES: BucketItem["status"][] = ["idea", "planned", "in_progress", "done"];
const SEASONS = ["any", "spring", "summer", "fall", "winter"];

function BucketListPage() {
  const bucket = useBucketList();
  const upsert = useUpsertBucket();
  const del = useDeleteBucket();
  const upsertTrip = useUpsertTrip();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BucketItem | null>(null);

  const grouped = useMemo(() => {
    const by: Record<string, BucketItem[]> = { idea: [], planned: [], in_progress: [], done: [] };
    for (const b of bucket.data ?? []) by[b.status]?.push(b);
    return by;
  }, [bucket.data]);

  async function createTripFrom(b: BucketItem) {
    const row = await upsertTrip.mutateAsync({
      name: b.title,
      destination: null,
      status: "planning",
      budget: b.estimated_cost ?? 0,
      cover_url: b.cover_url,
      trip_type: "leisure",
    } as any);
    await upsert.mutateAsync({ id: b.id, status: "in_progress", related_trip_id: row.id });
    navigate({ to: "/trips/$tripId", params: { tripId: row.id } });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 md:p-10">
      <div>
        <Link to="/trips" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Trips
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70">TRAVEL</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Sparkles className="size-6 text-primary" /> Bucket List
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Somewhere you'd love to go, someday.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 size-4" /> Add item
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s) => (
          <section key={s}>
            <h2 className="mb-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
              {s.replace(/_/g, " ")} · <span className="text-foreground/60">{grouped[s].length}</span>
            </h2>
            <div className="space-y-3">
              {grouped[s].map((b) => (
                <GlassCard key={b.id} className="group overflow-hidden p-0">
                  {b.cover_url && <img src={b.cover_url} alt="" className="h-28 w-full object-cover" />}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 truncate font-medium">{b.title}</h3>
                      {b.category && <Badge variant="outline" className="shrink-0 text-[10px]">{b.category}</Badge>}
                    </div>
                    {b.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {b.estimated_cost != null && <span>~${Number(b.estimated_cost).toLocaleString()}</span>}
                      {b.vacation_days_needed != null && <span>{b.vacation_days_needed}d</span>}
                      {b.ideal_season && <span className="capitalize">{b.ideal_season}</span>}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Progress</span><span>{b.progress_pct}%</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${b.progress_pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setDialogOpen(true); }}>Edit</Button>
                      {s !== "done" && (
                        <Button size="sm" variant="outline" onClick={() => createTripFrom(b)}>
                          <Compass className="mr-1 size-3.5" /> Trip
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Remove "${b.title}"?`) && del.mutate(b.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
              {grouped[s].length === 0 && (
                <p className="text-xs text-muted-foreground/60">—</p>
              )}
            </div>
          </section>
        ))}
      </div>

      <BucketDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}

function BucketDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: BucketItem | null }) {
  const upsert = useUpsertBucket();
  const [f, setF] = useState<any>({ title: "", status: "idea", progress_pct: 0, ideal_season: "any" });
  useMemo(() => setF(editing ?? { title: "", status: "idea", progress_pct: 0, ideal_season: "any" }), [editing, open]);

  async function save() {
    if (!f.title?.trim()) return;
    await upsert.mutateAsync({
      ...(editing ? { id: editing.id } : {}),
      title: f.title.trim(),
      status: f.status,
      description: f.description || null,
      category: f.category || null,
      cover_url: f.cover_url || null,
      progress_pct: Number(f.progress_pct ?? 0),
      estimated_cost: f.estimated_cost != null && f.estimated_cost !== "" ? Number(f.estimated_cost) : null,
      vacation_days_needed: f.vacation_days_needed != null && f.vacation_days_needed !== "" ? Number(f.vacation_days_needed) : null,
      ideal_season: f.ideal_season || null,
      requirements: f.requirements || null,
      notes: f.notes || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit bucket item" : "New bucket item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></div>
          <div><Label>Description</Label><Textarea rows={2} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={f.status ?? "idea"} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Season</Label>
              <Select value={f.ideal_season ?? "any"} onValueChange={(v) => setF({ ...f, ideal_season: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label><Input value={f.category ?? ""} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
            <div><Label>Progress %</Label><Input type="number" min={0} max={100} value={f.progress_pct ?? 0} onChange={(e) => setF({ ...f, progress_pct: e.target.value })} /></div>
            <div><Label>Est. cost</Label><Input type="number" value={f.estimated_cost ?? ""} onChange={(e) => setF({ ...f, estimated_cost: e.target.value })} /></div>
            <div><Label>Vacation days</Label><Input type="number" value={f.vacation_days_needed ?? ""} onChange={(e) => setF({ ...f, vacation_days_needed: e.target.value })} /></div>
          </div>
          <div><Label>Cover image URL</Label><Input value={f.cover_url ?? ""} onChange={(e) => setF({ ...f, cover_url: e.target.value })} /></div>
          <div><Label>Requirements</Label><Textarea rows={2} value={f.requirements ?? ""} onChange={(e) => setF({ ...f, requirements: e.target.value })} placeholder="Visa, gear, training…" /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
