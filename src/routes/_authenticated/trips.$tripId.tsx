import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Calendar, MapPin, Plane, Wallet, Package, Camera, StickyNote,
  Plus, Trash2, ExternalLink, Star, ListChecks, Compass,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useTrip, useUpsertTrip, useDeleteTrip,
  useTripItems, useUpsertTripItem, useDeleteTripItem,
  useTripFlights, useUpsertTripFlight, useDeleteTripFlight,
  useTripPacking, useUpsertPacking, useDeletePacking,
  useTripPhotos, useUpsertPhoto, useDeletePhoto,
  useTripAllocations, useUpsertAllocation, useDeleteAllocation,
  useTripExpenses, useUpsertTripExpense, useDeleteTripExpense,
  useTripPlaces, useUpsertTripPlace, useDeleteTripPlace,
  usePlaces, useUpsertPlace,
  type Trip,
} from "@/lib/atlas-data";
import { PlaceAutocomplete, type PickedPlace } from "@/components/trips/PlaceAutocomplete";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({ meta: [{ title: "Trip — Atlas" }] }),
  component: TripWorkspace,
});

function TripWorkspace() {
  const { tripId } = Route.useParams();
  const trip = useTrip(tripId);
  const navigate = useNavigate();

  if (trip.isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!trip.data) return (
    <div className="p-10">
      <p className="text-muted-foreground">Trip not found.</p>
      <Link to="/trips" className="text-primary hover:underline">Back to trips</Link>
    </div>
  );

  const t = trip.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <TripHeader trip={t} onDeleted={() => navigate({ to: "/trips" })} />

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="flex w-full flex-wrap justify-start bg-white/[0.03] p-1">
          <TabsTrigger value="overview"><Compass className="mr-2 size-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="plan"><Calendar className="mr-2 size-3.5" /> Plan</TabsTrigger>
          <TabsTrigger value="budget"><Wallet className="mr-2 size-3.5" /> Budget</TabsTrigger>
          <TabsTrigger value="packing"><Package className="mr-2 size-3.5" /> Packing</TabsTrigger>
          <TabsTrigger value="places"><MapPin className="mr-2 size-3.5" /> Places</TabsTrigger>
          <TabsTrigger value="photos"><Camera className="mr-2 size-3.5" /> Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab trip={t} /></TabsContent>
        <TabsContent value="plan"><PlanTab trip={t} /></TabsContent>
        <TabsContent value="budget"><BudgetTab trip={t} /></TabsContent>
        <TabsContent value="packing"><PackingTab trip={t} /></TabsContent>
        <TabsContent value="places"><PlacesTab trip={t} /></TabsContent>
        <TabsContent value="photos"><PhotosTab trip={t} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Header ---------- */
function TripHeader({ trip, onDeleted }: { trip: Trip; onDeleted: () => void }) {
  const upsert = useUpsertTrip();
  const del = useDeleteTrip();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(trip.name);
  const [start, setStart] = useState(trip.start_date ?? "");
  const [end, setEnd] = useState(trip.end_date ?? "");
  const [status, setStatus] = useState(trip.status);
  const [cover, setCover] = useState(trip.cover_url ?? "");
  const [destination, setDestination] = useState((trip as any).destination_text ?? trip.destination ?? "");

  async function save() {
    await upsert.mutateAsync({
      id: trip.id, name, start_date: start || null, end_date: end || null,
      status, cover_url: cover || null,
      destination: destination || null, destination_text: destination || null,
    } as any);
    setEdit(false);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/trips" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Trips
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEdit((v) => !v)}>{edit ? "Cancel" : "Edit"}</Button>
          {edit && <Button size="sm" onClick={save}>Save</Button>}
          {edit && (
            <Button variant="ghost" size="sm" className="text-rose-300 hover:text-rose-400"
              onClick={async () => {
                if (!confirm(`Delete "${trip.name}"?`)) return;
                await del.mutateAsync(trip.id);
                onDeleted();
              }}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <GlassCard className="relative overflow-hidden p-0">
        <div className="relative h-48 w-full overflow-hidden">
          {trip.cover_url ? (
            <img src={trip.cover_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-primary/30 via-accent/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {edit ? (
              <div className="space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xl bg-black/40 text-2xl font-semibold" />
                <div className="grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
                  <Input placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} className="bg-black/40" />
                  <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-black/40" />
                  <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-black/40" />
                  <Select value={status} onValueChange={(v) => setStatus(v as Trip["status"])}>
                    <SelectTrigger className="bg-black/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Cover image URL" value={cover} onChange={(e) => setCover(e.target.value)} className="max-w-2xl bg-black/40" />
              </div>
            ) : (
              <>
                <Badge className="mb-2 text-[10px] font-mono uppercase tracking-widest">{trip.status}</Badge>
                <h1 className="text-3xl font-semibold tracking-tight">{trip.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(trip as any).destination_text ?? trip.destination ?? "—"}
                  {trip.start_date && ` · ${trip.start_date}`}{trip.end_date && ` — ${trip.end_date}`}
                </p>
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------- Overview ---------- */
function OverviewTab({ trip }: { trip: Trip }) {
  const upsert = useUpsertTrip();
  const [notes, setNotes] = useState(trip.notes ?? "");
  const [rating, setRating] = useState<number | null>(trip.rating ?? null);
  const [lessons, setLessons] = useState((trip as any).lessons_learned ?? "");
  const [wouldReturn, setWouldReturn] = useState((trip as any).would_visit_again ?? false);
  const isCompleted = trip.status === "completed";

  async function saveNotes() {
    await upsert.mutateAsync({ id: trip.id, notes } as any);
    toast.success("Notes saved");
  }
  async function saveMemoryFields() {
    await upsert.mutateAsync({
      id: trip.id, rating, lessons_learned: lessons, would_visit_again: wouldReturn,
    } as any);
    toast.success("Saved");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="p-5 lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Notes</h3>
          <Button size="sm" variant="ghost" onClick={saveNotes}>Save</Button>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={10} placeholder="High-level trip notes — quick thoughts, links, references…" />
      </GlassCard>

      <div className="space-y-4">
        {isCompleted && (
          <GlassCard className="space-y-3 p-5">
            <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Memories</h3>
            <div>
              <Label className="text-xs">Rating</Label>
              <div className="mt-1 flex items-center gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n === rating ? null : n)}
                    className={cn("size-8 rounded transition-colors", (rating ?? 0) >= n ? "text-amber-300" : "text-white/20 hover:text-white/40")}>
                    <Star className="size-full" fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Lessons learned</Label>
              <Textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={wouldReturn} onCheckedChange={(v) => setWouldReturn(!!v)} />
              Would visit again
            </label>
            <Button size="sm" onClick={saveMemoryFields}>Save memories</Button>
          </GlassCard>
        )}
        <GlassCard className="p-5">
          <h3 className="mb-2 text-sm font-mono uppercase tracking-widest text-muted-foreground">Trip facts</h3>
          <dl className="space-y-1.5 text-sm">
            <Fact k="Type" v={trip.trip_type} />
            <Fact k="Status" v={trip.status} />
            <Fact k="Budget" v={`$${Number(trip.budget ?? 0).toLocaleString()}`} />
            <Fact k="Timezone" v={(trip as any).timezone ?? "—"} />
          </dl>
        </GlassCard>
      </div>
    </div>
  );
}
function Fact({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/5 pb-1.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate">{String(v ?? "—")}</dd>
    </div>
  );
}

/* ---------- Plan: Itinerary / Reservations / Flights / Notes ---------- */
function PlanTab({ trip }: { trip: Trip }) {
  return (
    <Tabs defaultValue="itinerary" className="space-y-4">
      <TabsList className="bg-white/[0.03]">
        <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
        <TabsTrigger value="reservations">Reservations</TabsTrigger>
        <TabsTrigger value="flights">Flights</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="itinerary"><ItineraryPanel trip={trip} /></TabsContent>
      <TabsContent value="reservations"><ReservationsPanel trip={trip} /></TabsContent>
      <TabsContent value="flights"><FlightsPanel trip={trip} /></TabsContent>
      <TabsContent value="notes"><OverviewTab trip={trip} /></TabsContent>
    </Tabs>
  );
}

function ItineraryPanel({ trip }: { trip: Trip }) {
  const items = useTripItems(trip.id);
  const upsert = useUpsertTripItem();
  const del = useDeleteTripItem();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");

  async function add() {
    if (!title.trim()) return;
    await upsert.mutateAsync({
      trip_id: trip.id, title: title.trim(), kind: "activity",
      on_date: date || null, start_time: allDay ? null : (start || null),
      end_time: allDay ? null : (end || null), all_day: allDay,
      location: location || null,
    } as any);
    setTitle(""); setStart(""); setEnd(""); setLocation("");
  }

  const nonReservation = (items.data ?? []).filter((i) => i.kind === "activity" || i.kind === "food" || i.kind === "travel");

  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="grid gap-2 md:grid-cols-6">
          <Input placeholder="Add itinerary item…" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} disabled={allDay} />
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} disabled={allDay} />
          <Button onClick={add}><Plus className="mr-1 size-4" /> Add</Button>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} /> All-day
          </label>
          <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-1" />
        </div>
      </GlassCard>

      <div className="space-y-2">
        {nonReservation.length === 0 && <p className="p-4 text-sm text-muted-foreground">No itinerary items yet.</p>}
        {nonReservation.map((i) => (
          <GlassCard key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">
                {i.on_date ?? "—"}{i.all_day ? " · all-day" : i.start_time ? ` · ${i.start_time}${i.end_time ? "–" + i.end_time : ""}` : ""}
                {i.location ? ` · ${i.location}` : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: i.id, trip_id: trip.id })}><Trash2 className="size-4" /></Button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function ReservationsPanel({ trip }: { trip: Trip }) {
  const items = useTripItems(trip.id);
  const upsert = useUpsertTripItem();
  const del = useDeleteTripItem();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [conf, setConf] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [provider, setProvider] = useState("");

  async function add() {
    if (!title.trim()) return;
    await upsert.mutateAsync({
      trip_id: trip.id, title: title.trim(), kind: "lodging",
      reservation_url: url || null, confirmation_code: conf || null,
      check_in_at: checkIn || null, check_out_at: checkOut || null,
      provider: provider || null,
    } as any);
    setTitle(""); setUrl(""); setConf(""); setCheckIn(""); setCheckOut(""); setProvider("");
  }

  const reservations = (items.data ?? []).filter((i) => i.kind === "lodging");

  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Hotel / Airbnb name" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Provider (Booking, Airbnb…)" value={provider} onChange={(e) => setProvider(e.target.value)} />
          <Input placeholder="Reservation URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Confirmation code" value={conf} onChange={(e) => setConf(e.target.value)} />
          <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <Button onClick={add}><Plus className="mr-1 size-4" /> Add reservation</Button>
      </GlassCard>

      {reservations.length === 0 && <p className="p-4 text-sm text-muted-foreground">No reservations yet.</p>}
      {reservations.map((r) => (
        <GlassCard key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">
                {r.provider ?? "—"}{r.check_in_at ? ` · in ${new Date(r.check_in_at).toLocaleString()}` : ""}
                {r.check_out_at ? ` · out ${new Date(r.check_out_at).toLocaleString()}` : ""}
              </p>
              {r.confirmation_code && (
                <p className="mt-1 text-xs">Conf: <code className="rounded bg-white/5 px-1.5 py-0.5">{r.confirmation_code}</code></p>
              )}
              {r.reservation_url && (
                <a href={r.reservation_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Open hotel site <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: r.id, trip_id: trip.id })}><Trash2 className="size-4" /></Button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function FlightsPanel({ trip }: { trip: Trip }) {
  const flights = useTripFlights(trip.id);
  const upsert = useUpsertTripFlight();
  const del = useDeleteTripFlight();
  const [f, setF] = useState<any>({ airline: "", flight_number: "", depart_airport: "", arrive_airport: "", depart_at: "", arrive_at: "", confirmation_code: "", seat: "" });

  async function add() {
    if (!f.airline && !f.flight_number) return;
    await upsert.mutateAsync({
      trip_id: trip.id, ...f,
      depart_at: f.depart_at || null, arrive_at: f.arrive_at || null,
    });
    setF({ airline: "", flight_number: "", depart_airport: "", arrive_airport: "", depart_at: "", arrive_at: "", confirmation_code: "", seat: "" });
  }

  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Airline" value={f.airline} onChange={(e) => setF({ ...f, airline: e.target.value })} />
          <Input placeholder="Flight #" value={f.flight_number} onChange={(e) => setF({ ...f, flight_number: e.target.value })} />
          <Input placeholder="From (IATA)" value={f.depart_airport} onChange={(e) => setF({ ...f, depart_airport: e.target.value.toUpperCase() })} />
          <Input placeholder="To (IATA)" value={f.arrive_airport} onChange={(e) => setF({ ...f, arrive_airport: e.target.value.toUpperCase() })} />
          <Input type="datetime-local" value={f.depart_at} onChange={(e) => setF({ ...f, depart_at: e.target.value })} />
          <Input type="datetime-local" value={f.arrive_at} onChange={(e) => setF({ ...f, arrive_at: e.target.value })} />
          <Input placeholder="Conf #" value={f.confirmation_code} onChange={(e) => setF({ ...f, confirmation_code: e.target.value })} />
          <Input placeholder="Seat" value={f.seat} onChange={(e) => setF({ ...f, seat: e.target.value })} />
        </div>
        <Button className="mt-2" onClick={add}><Plane className="mr-2 size-4" /> Add flight</Button>
      </GlassCard>
      {(flights.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No flights yet.</p>}
      {(flights.data ?? []).map((fl) => (
        <GlassCard key={fl.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="font-medium">{fl.airline ?? ""} {fl.flight_number ?? ""}</p>
            <p className="text-xs text-muted-foreground">
              {fl.depart_airport ?? "—"} → {fl.arrive_airport ?? "—"}
              {fl.depart_at ? ` · ${new Date(fl.depart_at).toLocaleString()}` : ""}
              {fl.seat ? ` · seat ${fl.seat}` : ""}
              {fl.confirmation_code ? ` · ${fl.confirmation_code}` : ""}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: fl.id, trip_id: trip.id })}><Trash2 className="size-4" /></Button>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------- Budget ---------- */
function BudgetTab({ trip }: { trip: Trip }) {
  const upsertTrip = useUpsertTrip();
  const allocs = useTripAllocations(trip.id);
  const upsertAlloc = useUpsertAllocation();
  const delAlloc = useDeleteAllocation();
  const expenses = useTripExpenses(trip.id);
  const upsertExp = useUpsertTripExpense();
  const delExp = useDeleteTripExpense();

  const [budget, setBudget] = useState(String(trip.budget ?? 0));
  const [cat, setCat] = useState("");
  const [alloc, setAlloc] = useState("");
  const [exp, setExp] = useState<any>({ description: "", amount: "", category: "", incurred_on: new Date().toISOString().slice(0, 10) });

  const totalAllocated = (allocs.data ?? []).reduce((s, a) => s + Number(a.allocated ?? 0), 0);
  const totalSpent = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const pct = trip.budget ? Math.min(100, Math.round((totalSpent / Number(trip.budget)) * 100)) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="p-5 lg:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label>Total budget</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="max-w-[160px]" />
              <Button size="sm" onClick={() => upsertTrip.mutate({ id: trip.id, budget: Number(budget || 0) } as any)}>Save</Button>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Spent / Allocated / Budget</p>
            <p className="text-lg font-semibold">${totalSpent.toLocaleString()} · ${totalAllocated.toLocaleString()} · ${Number(trip.budget ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
        </div>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-1">
        <h3 className="mb-3 text-sm font-mono uppercase tracking-widest text-muted-foreground">Allocations</h3>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Input placeholder="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="col-span-2" />
          <Input type="number" placeholder="$" value={alloc} onChange={(e) => setAlloc(e.target.value)} />
        </div>
        <Button size="sm" className="mb-3" onClick={async () => {
          if (!cat.trim()) return;
          await upsertAlloc.mutateAsync({ trip_id: trip.id, category: cat.trim(), allocated: Number(alloc || 0) });
          setCat(""); setAlloc("");
        }}><Plus className="mr-1 size-4" /> Add</Button>
        <ul className="space-y-1.5">
          {(allocs.data ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.category}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">${Number(a.allocated).toLocaleString()}</span>
                <Button size="sm" variant="ghost" onClick={() => delAlloc.mutate({ id: a.id, trip_id: trip.id })}><Trash2 className="size-3.5" /></Button>
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard className="p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-mono uppercase tracking-widest text-muted-foreground">Expenses</h3>
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <Input placeholder="Description" value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} className="md:col-span-2" />
          <Input placeholder="Category" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })} />
          <Input type="number" placeholder="$" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} />
          <Input type="date" value={exp.incurred_on} onChange={(e) => setExp({ ...exp, incurred_on: e.target.value })} />
        </div>
        <Button size="sm" className="mb-3" onClick={async () => {
          if (!exp.description.trim() || !exp.amount) return;
          await upsertExp.mutateAsync({ trip_id: trip.id, description: exp.description.trim(), amount: Number(exp.amount), category: exp.category || "misc", incurred_on: exp.incurred_on });
          setExp({ description: "", amount: "", category: "", incurred_on: new Date().toISOString().slice(0, 10) });
        }}><Plus className="mr-1 size-4" /> Add expense</Button>
        <ul className="space-y-1.5">
          {(expenses.data ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between border-b border-white/5 pb-1.5 text-sm">
              <span className="min-w-0 truncate">{e.description} <span className="text-muted-foreground">· {e.category}</span></span>
              <span className="flex items-center gap-2">
                <span className="font-mono">${Number(e.amount).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">{e.incurred_on}</span>
                <Button size="sm" variant="ghost" onClick={() => delExp.mutate({ id: e.id, trip_id: trip.id })}><Trash2 className="size-3.5" /></Button>
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

/* ---------- Packing ---------- */
function PackingTab({ trip }: { trip: Trip }) {
  const packing = useTripPacking(trip.id);
  const upsert = useUpsertPacking();
  const del = useDeletePacking();
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [qty, setQty] = useState("1");
  const [needs, setNeeds] = useState(false);

  const items = packing.data ?? [];
  const packed = items.filter((i) => i.packed).length;
  const pct = items.length ? Math.round((packed / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Packing progress</h3>
          <span className="font-mono text-sm">{packed}/{items.length} · {pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <Input placeholder="Item" value={name} onChange={(e) => setName(e.target.value)} className="md:col-span-2" />
          <Input placeholder="Category" value={cat} onChange={(e) => setCat(e.target.value)} />
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button onClick={async () => {
            if (!name.trim()) return;
            await upsert.mutateAsync({ trip_id: trip.id, name: name.trim(), category: cat || null, quantity: Number(qty || 1), needs_action: needs });
            setName(""); setCat(""); setQty("1"); setNeeds(false);
          }}><Plus className="mr-1 size-4" /> Add</Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={needs} onCheckedChange={(v) => setNeeds(!!v)} /> Needs action (create task)
        </label>
      </GlassCard>

      <div className="space-y-1.5">
        {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing packed yet.</p>}
        {items.map((i) => (
          <GlassCard key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <Checkbox checked={i.packed} onCheckedChange={(v) => upsert.mutate({ ...i, packed: !!v })} />
              <span className={cn("truncate text-sm", i.packed && "text-muted-foreground line-through")}>{i.name}</span>
              {i.quantity > 1 && <span className="font-mono text-xs text-muted-foreground">×{i.quantity}</span>}
              {i.category && <Badge variant="outline" className="ml-1 text-[10px]">{i.category}</Badge>}
              {i.needs_action && <Badge className="ml-1 bg-amber-500/20 text-[10px] text-amber-200"><ListChecks className="mr-1 size-3" />action</Badge>}
            </label>
            <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: i.id, trip_id: trip.id })}><Trash2 className="size-4" /></Button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ---------- Places ---------- */
function PlacesTab({ trip }: { trip: Trip }) {
  const links = useTripPlaces(trip.id);
  const upsertLink = useUpsertTripPlace();
  const delLink = useDeleteTripPlace();
  const places = usePlaces();
  const upsertPlace = useUpsertPlace();
  const [newName, setNewName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  async function quickAdd() {
    if (!newName.trim()) return;
    const p = await upsertPlace.mutateAsync({ name: newName.trim(), category: "point_of_interest", status: "want" });
    await upsertLink.mutateAsync({ trip_id: trip.id, place_id: p.id });
    setNewName("");
  }

  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Add a new place…" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
          <Button onClick={quickAdd}><Plus className="mr-1 size-4" /> New place</Button>
          <Button variant="outline" onClick={() => setPickerOpen((v) => !v)}>{pickerOpen ? "Close" : "Link existing"}</Button>
        </div>
        {pickerOpen && (
          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/10">
            {(places.data ?? []).map((p) => {
              const linked = (links.data ?? []).some((l) => l.place_id === p.id);
              return (
                <button key={p.id} type="button" disabled={linked}
                  onClick={() => upsertLink.mutate({ trip_id: trip.id, place_id: p.id })}
                  className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5",
                    linked && "opacity-40")}>
                  <span>{p.name}</span>
                  <span className="text-xs text-muted-foreground">{linked ? "linked" : "add →"}</span>
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2">
        {(links.data ?? []).map((tp) => (
          <GlassCard key={tp.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium">{tp.place?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{tp.place?.address ?? tp.place?.category}</p>
              {tp.place?.maps_url && (
                <a href={tp.place.maps_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Open in Maps <ExternalLink className="size-3" />
                </a>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant={tp.visited ? "default" : "outline"} onClick={() => upsertLink.mutate({ ...tp, visited: !tp.visited })}>
                  {tp.visited ? "Visited ✓" : "Mark visited"}
                </Button>
                <Button size="sm" variant={tp.is_favorite ? "default" : "outline"} onClick={() => upsertLink.mutate({ ...tp, is_favorite: !tp.is_favorite })}>
                  {tp.is_favorite ? "★ Favorite" : "☆ Favorite"}
                </Button>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => delLink.mutate({ id: tp.id, trip_id: trip.id })}><Trash2 className="size-4" /></Button>
          </GlassCard>
        ))}
        {(links.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No places linked yet.</p>}
      </div>
    </div>
  );
}

/* ---------- Photos ---------- */
function PhotosTab({ trip }: { trip: Trip }) {
  const photos = useTripPhotos(trip.id);
  const upsert = useUpsertPhoto();
  const del = useDeletePhoto();
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [taken, setTaken] = useState("");

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Image URL" value={url} onChange={(e) => setUrl(e.target.value)} className="md:col-span-2" />
          <Input placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <Input type="date" value={taken} onChange={(e) => setTaken(e.target.value)} />
        </div>
        <Button className="mt-2" onClick={async () => {
          if (!url.trim()) return;
          await upsert.mutateAsync({ trip_id: trip.id, url: url.trim(), caption: caption || null, taken_on: taken || null, source: "manual" });
          setUrl(""); setCaption(""); setTaken("");
        }}><Camera className="mr-2 size-4" /> Add photo</Button>
      </GlassCard>

      {(photos.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No photos yet. Google Photos integration coming.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(photos.data ?? []).map((p) => (
          <GlassCard key={p.id} className="group relative overflow-hidden p-0">
            <img src={p.url} alt={p.caption ?? ""} className="aspect-video w-full object-cover" />
            {p.caption && <p className="p-3 text-sm">{p.caption}</p>}
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
              onClick={() => del.mutate({ id: p.id, trip_id: trip.id })}
            ><Trash2 className="size-4" /></button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
