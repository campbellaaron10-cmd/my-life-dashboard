import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Plane, MapPin, Sparkles, Compass } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useTrips, useUpsertTrip, usePlaces, useBucketList, type Trip,
} from "@/lib/atlas-data";
import { TripsMap, type MapPin as MP } from "@/components/trips/TripsMap";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "Trips — Atlas" },
      { name: "description", content: "Map, plan, and remember every trip — with Places and a bucket list, wired into Atlas." },
      { property: "og:title", content: "Trips — Atlas" },
      { property: "og:description", content: "Interactive world map, upcoming trips, saved places, and bucket-list progress." },
    ],
  }),
  component: TripsLandingPage,
});

const STATUS_META: Record<Trip["status"], { label: string; tone: string }> = {
  planning:  { label: "Planning",  tone: "bg-white/10 text-foreground" },
  upcoming:  { label: "Upcoming",  tone: "bg-primary/20 text-primary" },
  active:    { label: "Active",    tone: "bg-emerald-400/20 text-emerald-300" },
  completed: { label: "Completed", tone: "bg-white/5 text-muted-foreground" },
  cancelled: { label: "Cancelled", tone: "bg-rose-500/15 text-rose-300" },
};

function daysUntil(start: string | null): number | null {
  if (!start) return null;
  const s = new Date(start + "T00:00:00").getTime();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((s - now.getTime()) / (1000 * 60 * 60 * 24));
}
function fmtDateRange(a: string | null, b: string | null) {
  if (!a && !b) return "Dates TBD";
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (a && b) return a === b ? fmt(a) : `${fmt(a)} — ${fmt(b)}`;
  return fmt((a ?? b)!);
}

function TripCoverFallback({ label }: { label?: string | null }) {
  const initial = (label ?? "").trim().charAt(0).toUpperCase() || "•";
  return (
    <div className="relative size-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,rgba(96,165,250,0.35),transparent_60%),radial-gradient(120%_80%_at_80%_90%,rgba(167,139,250,0.3),transparent_60%),linear-gradient(135deg,#0b1220,#111827)]" />
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "18px 18px" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-5xl font-semibold text-white/25">{initial}</span>
      </div>
    </div>
  );
}

function TripsLandingPage() {
  const trips = useTrips();
  const places = usePlaces();
  const bucket = useBucketList();
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const now = new Date().toISOString().slice(0, 10);
  const sorted = trips.data ?? [];
  const upcoming = sorted.filter((t) => (t.start_date ?? "") >= now && t.status !== "cancelled" && t.status !== "completed");
  const past = sorted.filter((t) => t.status === "completed" || ((t.end_date ?? "") && (t.end_date ?? "") < now));
  const next = upcoming[0];

  const pins: MP[] = useMemo(() => {
    const out: MP[] = [];
    for (const t of sorted) {
      // trip pins come from destination place; if none, skip on map
      const place = (t as any).destination_place_id
        ? places.data?.find((p) => p.id === (t as any).destination_place_id)
        : null;
      if (place && place.lat != null && place.lng != null) {
        out.push({
          id: `trip-${t.id}`,
          lat: Number(place.lat), lng: Number(place.lng),
          title: t.name,
          kind: (t.status === "completed" ? "past" : "upcoming"),
          onClick: () => navigate({ to: "/trips/$tripId", params: { tripId: t.id } }),
        });
      }
    }
    for (const p of places.data ?? []) {
      if (p.lat != null && p.lng != null) {
        out.push({
          id: `place-${p.id}`,
          lat: Number(p.lat), lng: Number(p.lng),
          title: p.name,
          kind: "place",
          onClick: () => navigate({ to: "/trips/places" }),
        });
      }
    }
    return out;
  }, [sorted, places.data, navigate]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70">TRAVEL</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trips</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan destinations, remember journeys, chase the bucket list.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/trips/places"><Button variant="outline" size="sm"><MapPin className="mr-2 size-4" /> Places</Button></Link>
          <Link to="/trips/bucket-list"><Button variant="outline" size="sm"><Sparkles className="mr-2 size-4" /> Bucket List</Button></Link>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> New Trip</Button>
        </div>
      </div>

      {/* Map */}
      <GlassCard className="p-3">
        <TripsMap pins={pins} height={440} />
        {pins.length === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Add a place with coordinates to start pinning your world.
          </p>
        )}
      </GlassCard>

      {/* Strips */}
      <div className="grid gap-4 md:grid-cols-3">
        <NextTripStrip trip={next} />
        <UpcomingStrip trips={upcoming.slice(0, 4)} />
        <BucketProgressStrip items={bucket.data ?? []} />
      </div>

      {/* Recent past */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Memories</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.slice(0, 6).map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </section>
      )}

      {/* All */}
      {(trips.data ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">All trips</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(trips.data ?? []).map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </section>
      )}

      <NewTripDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function NextTripStrip({ trip }: { trip: Trip | undefined }) {
  if (!trip) {
    return (
      <GlassCard className="flex min-h-[160px] flex-col justify-center p-5">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Next trip</p>
        <p className="mt-2 text-sm text-muted-foreground">Nothing planned. Time to change that.</p>
      </GlassCard>
    );
  }
  const d = daysUntil(trip.start_date);
  return (
    <Link to="/trips/$tripId" params={{ tripId: trip.id }} className="block">
      <GlassCard className="group relative min-h-[160px] overflow-hidden p-5">
        {trip.cover_url && (
          <div className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-40">
            <img src={trip.cover_url} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>
        )}
        <div className="relative">
          <p className="text-xs font-mono uppercase tracking-widest text-primary/80">Next trip</p>
          <h3 className="mt-1 text-xl font-semibold">{trip.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{fmtDateRange(trip.start_date, trip.end_date)}</p>
          {d !== null && d >= 0 && (
            <p className="mt-3 font-mono text-3xl font-semibold text-primary">
              {d === 0 ? "TODAY" : `T-${d}`}
            </p>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}

function UpcomingStrip({ trips }: { trips: Trip[] }) {
  return (
    <GlassCard className="min-h-[160px] p-5">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Upcoming</p>
      {trips.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No upcoming trips.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {trips.map((t) => (
            <li key={t.id}>
              <Link to="/trips/$tripId" params={{ tripId: t.id }} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5">
                <span className="truncate">{t.name}</span>
                <span className="ml-2 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {fmtDateRange(t.start_date, t.end_date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function BucketProgressStrip({ items }: { items: any[] }) {
  const top = items.slice(0, 3);
  return (
    <Link to="/trips/bucket-list" className="block">
      <GlassCard className="min-h-[160px] p-5 transition-colors hover:bg-white/[0.03]">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Bucket list</p>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing on the list — start dreaming.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {top.map((b) => (
              <li key={b.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{b.title}</span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">{b.progress_pct}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${b.progress_pct ?? 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </Link>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const d = daysUntil(trip.start_date);
  const s = STATUS_META[trip.status];
  return (
    <Link to="/trips/$tripId" params={{ tripId: trip.id }} className="group block">
      <GlassCard className="relative h-full overflow-hidden p-0">
        <div className="relative h-32 w-full overflow-hidden">
          {trip.cover_url ? (
            <img src={trip.cover_url} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="size-full bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3">
            <Badge className={cn("text-[10px] font-mono uppercase tracking-widest", s.tone)}>{s.label}</Badge>
          </div>
          {trip.rating != null && trip.status === "completed" && (
            <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-xs backdrop-blur">
              {"★".repeat(trip.rating)}<span className="text-white/30">{"★".repeat(5 - (trip.rating ?? 0))}</span>
            </div>
          )}
          {d !== null && d >= 0 && trip.status !== "completed" && (
            <div className="absolute bottom-3 right-3 rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 font-mono text-[10px] uppercase text-primary backdrop-blur">
              {d === 0 ? "Today" : `T-${d}`}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="truncate text-base font-semibold">{trip.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {(trip as any).destination_text ?? trip.destination ?? "—"} · {fmtDateRange(trip.start_date, trip.end_date)}
          </p>
        </div>
      </GlassCard>
    </Link>
  );
}

function NewTripDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const upsert = useUpsertTrip();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState<string>("leisure");
  const [status, setStatus] = useState<Trip["status"]>("planning");
  const [cover, setCover] = useState("");

  async function submit() {
    if (!name.trim()) return;
    const row = await upsert.mutateAsync({
      name: name.trim(),
      destination: destination.trim() || null,
      destination_text: destination.trim() || null,
      start_date: start || null,
      end_date: end || null,
      status,
      trip_type: type,
      cover_url: cover.trim() || null,
      budget: 0,
    } as any);
    onOpenChange(false);
    setName(""); setDestination(""); setStart(""); setEnd(""); setType("leisure"); setStatus("planning"); setCover("");
    navigate({ to: "/trips/$tripId", params: { tripId: row.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New trip</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Iceland Ring Road" autoFocus />
          </div>
          <div>
            <Label>Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Reykjavík, Iceland" />
            <p className="mt-1 text-[11px] text-muted-foreground">Places autocomplete coming — free-text works today.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leisure">Leisure</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="road_trip">Road trip</SelectItem>
                  <SelectItem value="camping">Camping</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Trip["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Cover image URL (optional)</Label>
            <Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || upsert.isPending}>
            <Compass className="mr-2 size-4" /> Create & open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
