import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, ExternalLink, Search } from "lucide-react";
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
import { usePlaces, useUpsertPlace, useDeletePlace, type Place } from "@/lib/atlas-data";

export const Route = createFileRoute("/_authenticated/trips/places")({
  head: () => ({ meta: [{ title: "Places — Atlas" }] }),
  component: PlacesLibraryPage,
});

const CATEGORIES = [
  "point_of_interest", "restaurant", "hotel", "activity",
  "landmark", "nature", "shopping", "other",
];

function PlacesLibraryPage() {
  const places = usePlaces();
  const upsert = useUpsertPlace();
  const del = useDeletePlace();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);

  const filtered = useMemo(() => {
    const list = places.data ?? [];
    return list.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return p.name.toLowerCase().includes(s) || (p.address ?? "").toLowerCase().includes(s) || (p.notes ?? "").toLowerCase().includes(s);
    });
  }, [places.data, q, statusFilter]);

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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Places</h1>
          <p className="mt-1 text-sm text-muted-foreground">One record per place — referenced by many trips.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 size-4" /> New place
        </Button>
      </div>

      <GlassCard className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="want">Want to visit</SelectItem>
            <SelectItem value="visited">Visited</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
          </SelectContent>
        </Select>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <GlassCard key={p.id} className="group flex flex-col justify-between p-4">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-medium">{p.name}</h3>
                <Badge variant="outline" className="shrink-0 text-[10px] uppercase">{p.status}</Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.address ?? p.category}</p>
              {p.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>}
              {p.rating != null && <p className="mt-1 text-xs text-amber-300">{"★".repeat(p.rating)}</p>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {p.maps_url ? (
                <a href={p.maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Maps <ExternalLink className="size-3" />
                </a>
              ) : <span />}
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${p.name}"?`) && del.mutate(p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
        {filtered.length === 0 && (
          <GlassCard className="col-span-full p-8 text-center text-sm text-muted-foreground">
            {(places.data ?? []).length === 0 ? "No saved places yet." : "No places match your search."}
          </GlassCard>
        )}
      </div>

      <PlaceDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  );
}

function PlaceDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Place | null }) {
  const upsert = useUpsertPlace();
  const initial = editing ?? { name: "", category: "point_of_interest", status: "want" } as any;
  const [f, setF] = useState<any>(initial);
  // reset when editing changes
  useMemo(() => setF(editing ?? { name: "", category: "point_of_interest", status: "want" }), [editing, open]);

  async function save() {
    if (!f.name?.trim()) return;
    await upsert.mutateAsync({
      ...(editing ? { id: editing.id } : {}),
      name: f.name.trim(),
      category: f.category ?? "point_of_interest",
      status: f.status ?? "want",
      address: f.address || null,
      notes: f.notes || null,
      maps_url: f.maps_url || null,
      google_place_id: f.google_place_id || null,
      lat: f.lat != null && f.lat !== "" ? Number(f.lat) : null,
      lng: f.lng != null && f.lng !== "" ? Number(f.lng) : null,
      rating: f.rating != null && f.rating !== "" ? Number(f.rating) : null,
      estimated_cost: f.estimated_cost != null && f.estimated_cost !== "" ? Number(f.estimated_cost) : null,
      travel_time_minutes: f.travel_time_minutes != null && f.travel_time_minutes !== "" ? Number(f.travel_time_minutes) : null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit place" : "New place"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={f.category ?? "point_of_interest"} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={f.status ?? "want"} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="want">Want to visit</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="visited">Visited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Latitude</Label>
              <Input type="number" step="any" value={f.lat ?? ""} onChange={(e) => setF({ ...f, lat: e.target.value })} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input type="number" step="any" value={f.lng ?? ""} onChange={(e) => setF({ ...f, lng: e.target.value })} />
            </div>
            <div>
              <Label>Rating (1–5)</Label>
              <Input type="number" min={1} max={5} value={f.rating ?? ""} onChange={(e) => setF({ ...f, rating: e.target.value })} />
            </div>
            <div>
              <Label>Est. cost</Label>
              <Input type="number" value={f.estimated_cost ?? ""} onChange={(e) => setF({ ...f, estimated_cost: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Google Maps URL</Label>
            <Input value={f.maps_url ?? ""} onChange={(e) => setF({ ...f, maps_url: e.target.value })} placeholder="https://maps.google.com/…" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
