import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus, Plane, MapPin, Trash2, Calendar as CalendarIcon,
  DollarSign, Bed, Utensils, Ticket, StickyNote, Navigation,
  Pencil, X,
} from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { PrivacyGuard } from "@/context/PrivacyMode";
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
  useTrips, useUpsertTrip, useDeleteTrip,
  useTripItems, useUpsertTripItem, useDeleteTripItem,
  useTripExpenses, useUpsertTripExpense, useDeleteTripExpense,
  type Trip, type TripItem, type TripExpense,
} from "@/lib/atlas-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "Trips — Atlas" },
      { name: "description", content: "Plan destinations, build itineraries, and track trip budgets — all wired into the Atlas Life OS." },
      { property: "og:title", content: "Trips — Atlas" },
      { property: "og:description", content: "Plan destinations, build itineraries, and track trip budgets in Atlas." },
    ],
  }),
  component: TripsPage,
});

const STATUS_META: Record<Trip["status"], { label: string; tone: string }> = {
  planning:  { label: "Planning",  tone: "bg-white/10 text-foreground" },
  upcoming:  { label: "Upcoming",  tone: "bg-primary/20 text-primary" },
  active:    { label: "Active",    tone: "bg-emerald-400/20 text-emerald-300" },
  completed: { label: "Completed", tone: "bg-white/5 text-muted-foreground" },
  cancelled: { label: "Cancelled", tone: "bg-rose-500/15 text-rose-300" },
};

const ITEM_ICON: Record<TripItem["kind"], typeof Bed> = {
  lodging: Bed,
  travel: Navigation,
  activity: Ticket,
  food: Utensils,
  note: StickyNote,
};

const EXPENSE_CATEGORIES = ["Lodging", "Travel", "Food", "Activities", "Fuel", "Souvenirs", "Other"];

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDateRange(a: string | null, b: string | null) {
  if (!a && !b) return "Dates TBD";
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (a && b) return `${fmt(a)} — ${fmt(b)}`;
  return fmt((a ?? b)!);
}
function daysUntil(start: string | null): number | null {
  if (!start) return null;
  const s = new Date(start + "T00:00:00").getTime();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((s - now.getTime()) / (1000 * 60 * 60 * 24));
}

function TripsPage() {
  const trips = useTrips();
  const upsertTrip = useUpsertTrip();
  const deleteTrip = useDeleteTrip();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Partial<Trip> | null>(null);

  const list = trips.data ?? [];
  const active = list.find((t) => t.id === selectedId) ?? list[0] ?? null;

  const grouped = useMemo(() => {
    const groups: Record<string, Trip[]> = { active: [], upcoming: [], planning: [], completed: [], cancelled: [] };
    for (const t of list) groups[t.status]?.push(t);
    return groups;
  }, [list]);

  function newTrip() {
    setEditingTrip({ name: "", status: "planning", budget: 0 });
  }
  function editTrip(t: Trip) {
    setEditingTrip(t);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Atlas / Trips</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground">
            Destinations, itineraries, and budgets — connected to your tasks and calendar.
          </p>
        </div>
        <Button onClick={newTrip} className="rounded-2xl">
          <Plus className="mr-2 size-4" /> New trip
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_1fr]">
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Plane className="size-3.5" /> All trips
          </div>
          <div className="space-y-4">
            {list.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                No trips yet. Plan your first adventure.
              </div>
            )}
            {(["active", "upcoming", "planning", "completed", "cancelled"] as const).map((s) =>
              grouped[s].length ? (
                <div key={s}>
                  <div className="mb-1.5 px-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {STATUS_META[s].label}
                  </div>
                  <div className="space-y-1">
                    {grouped[s].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2.5 text-left transition-all",
                          active?.id === t.id
                            ? "bg-white/10 ring-1 ring-white/10"
                            : "hover:bg-white/5",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{t.name}</span>
                          <Badge className={cn("shrink-0 border-0 text-[0.65rem]", STATUS_META[t.status].tone)}>
                            {STATUS_META[t.status].label}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {t.destination || "—"} · {fmtDateRange(t.start_date, t.end_date)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </GlassCard>

        {active ? (
          <TripDetail
            key={active.id}
            trip={active}
            onEdit={() => editTrip(active)}
            onDelete={async () => {
              if (confirm(`Delete trip "${active.name}"?`)) {
                await deleteTrip.mutateAsync(active.id);
                setSelectedId(null);
              }
            }}
          />
        ) : (
          <GlassCard className="flex min-h-[400px] items-center justify-center p-10 text-center">
            <div>
              <Plane className="mx-auto size-10 text-muted-foreground" />
              <div className="mt-4 text-lg font-medium">No trip selected</div>
              <div className="text-sm text-muted-foreground">Create a trip to start planning.</div>
              <Button onClick={newTrip} className="mt-4 rounded-2xl">
                <Plus className="mr-2 size-4" /> New trip
              </Button>
            </div>
          </GlassCard>
        )}
      </div>

      {editingTrip && (
        <TripEditor
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onSave={async (patch) => {
            const saved = await upsertTrip.mutateAsync(patch);
            setEditingTrip(null);
            setSelectedId(saved.id);
          }}
        />
      )}
    </div>
  );
}

// ---------- Trip detail ----------

function TripDetail({
  trip, onEdit, onDelete,
}: { trip: Trip; onEdit: () => void; onDelete: () => void }) {
  const items = useTripItems(trip.id);
  const expenses = useTripExpenses(trip.id);

  const [tab, setTab] = useState<"itinerary" | "expenses" | "overview">("overview");
  const [editingItem, setEditingItem] = useState<Partial<TripItem> | null>(null);
  const [editingExpense, setEditingExpense] = useState<Partial<TripExpense> | null>(null);

  const upsertItem = useUpsertTripItem();
  const deleteItem = useDeleteTripItem();
  const upsertExpense = useUpsertTripExpense();
  const deleteExpense = useDeleteTripExpense();

  const spent = useMemo(
    () => (expenses.data ?? []).reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses.data],
  );
  const plannedCost = useMemo(
    () => (items.data ?? []).reduce((s, i) => s + Number(i.cost || 0), 0),
    [items.data],
  );
  const budget = Number(trip.budget || 0);
  const remaining = budget - spent;
  const budgetPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const dU = daysUntil(trip.start_date);

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge className={cn("border-0", STATUS_META[trip.status].tone)}>
                {STATUS_META[trip.status].label}
              </Badge>
              {dU !== null && dU >= 0 && trip.status !== "completed" && trip.status !== "cancelled" && (
                <span className="text-xs text-muted-foreground">
                  {dU === 0 ? "Today" : dU === 1 ? "Tomorrow" : `in ${dU} days`}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{trip.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {trip.destination && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {trip.destination}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="size-3.5" /> {fmtDateRange(trip.start_date, trip.end_date)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit} className="rounded-xl">
              <Pencil className="mr-1.5 size-3.5" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="rounded-xl text-rose-300 hover:text-rose-200">
              <Trash2 className="mr-1.5 size-3.5" /> Delete
            </Button>
          </div>
        </div>

        <PrivacyGuard>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricTile label="Budget"    value={fmtMoney(budget)} />
            <MetricTile label="Spent"     value={fmtMoney(spent)}  tone={spent > budget && budget > 0 ? "warn" : undefined} />
            <MetricTile label="Remaining" value={fmtMoney(remaining)} tone={remaining < 0 ? "warn" : "good"} />
          </div>
          {budget > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full transition-all",
                  spent > budget ? "bg-rose-400" : "bg-primary",
                )}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          )}
        </PrivacyGuard>

        {trip.notes && (
          <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-white/5 p-4 text-sm text-muted-foreground">
            {trip.notes}
          </p>
        )}
      </GlassCard>

      <div className="flex gap-1 rounded-2xl bg-white/5 p-1">
        {[
          { k: "overview" as const, label: "Overview" },
          { k: "itinerary" as const, label: `Itinerary (${items.data?.length ?? 0})` },
          { k: "expenses" as const, label: `Expenses (${expenses.data?.length ?? 0})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === t.k ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Planned</div>
            <div className="mt-2 text-2xl font-semibold">{fmtMoney(plannedCost)}</div>
            <div className="text-xs text-muted-foreground">Sum of itinerary item costs</div>
          </GlassCard>
          <GlassCard className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Items</div>
            <div className="mt-2 flex items-baseline gap-3 text-sm">
              {(["lodging", "travel", "activity", "food", "note"] as const).map((k) => {
                const Icon = ITEM_ICON[k];
                const count = (items.data ?? []).filter((i) => i.kind === k).length;
                return (
                  <div key={k} className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="size-4" />
                    <span className="text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {tab === "itinerary" && (
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium">Itinerary</div>
            <Button
              size="sm"
              onClick={() => setEditingItem({ trip_id: trip.id, kind: "activity", title: "", cost: 0 })}
              className="rounded-xl"
            >
              <Plus className="mr-1.5 size-3.5" /> Add item
            </Button>
          </div>
          {(items.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              No itinerary items yet.
            </div>
          ) : (
            <div className="space-y-2">
              {(items.data ?? []).map((item) => {
                const Icon = ITEM_ICON[item.kind];
                return (
                  <div
                    key={item.id}
                    className="group flex items-start gap-3 rounded-2xl bg-white/5 p-3 hover:bg-white/10"
                  >
                    <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white/10">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.title}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {item.location && <span>📍 {item.location}</span>}
                            {item.on_date && (
                              <span>
                                {new Date(item.on_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            {Number(item.cost) > 0 && (
                              <PrivacyGuard><span>{fmtMoney(Number(item.cost))}</span></PrivacyGuard>
                            )}
                          </div>
                          {item.notes && <div className="mt-1 text-xs text-muted-foreground">{item.notes}</div>}
                        </div>
                        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)} className="size-7 p-0">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItem.mutate({ id: item.id, trip_id: trip.id })}
                            className="size-7 p-0 text-rose-300"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {tab === "expenses" && (
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium">Expenses</div>
            <Button
              size="sm"
              onClick={() =>
                setEditingExpense({
                  trip_id: trip.id, description: "", amount: 0,
                  category: "Other", incurred_on: new Date().toISOString().slice(0, 10),
                })
              }
              className="rounded-xl"
            >
              <Plus className="mr-1.5 size-3.5" /> Add expense
            </Button>
          </div>
          {(expenses.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              No expenses logged.
            </div>
          ) : (
            <PrivacyGuard>
              <div className="divide-y divide-white/5">
                {(expenses.data ?? []).map((e) => (
                  <div key={e.id} className="group flex items-center gap-3 py-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                      <DollarSign className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.category} · {new Date(e.incurred_on + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{fmtMoney(Number(e.amount))}</div>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => setEditingExpense(e)} className="size-7 p-0">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteExpense.mutate({ id: e.id, trip_id: trip.id })}
                        className="size-7 p-0 text-rose-300"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </PrivacyGuard>
          )}
        </GlassCard>
      )}

      {editingItem && (
        <TripItemEditor
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (patch) => {
            await upsertItem.mutateAsync(patch);
            setEditingItem(null);
          }}
        />
      )}

      {editingExpense && (
        <TripExpenseEditor
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSave={async (patch) => {
            await upsertExpense.mutateAsync(patch);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}

// ---------- Small components ----------

function MetricTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "warn" && "text-rose-300",
          tone === "good" && "text-emerald-300",
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ---------- Editors ----------

function TripEditor({
  trip, onClose, onSave,
}: {
  trip: Partial<Trip>;
  onClose: () => void;
  onSave: (patch: Partial<Trip> & { name: string }) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Trip>>(trip);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{trip.id ? "Edit trip" : "New trip"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Name</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Weekend in Asheville"
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Input
              value={form.destination ?? ""}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="Asheville, NC"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
              />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status ?? "planning"}
                onValueChange={(v) => setForm({ ...form, status: v as Trip["status"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as Trip["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget ($)</Label>
              <Input
                type="number"
                min={0}
                value={form.budget ?? 0}
                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Packing list, links, must-do notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}><X className="mr-1 size-4" /> Cancel</Button>
          <Button
            disabled={!form.name?.trim()}
            onClick={() => onSave({ ...form, name: form.name!.trim() })}
          >
            Save trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TripItemEditor({
  item, onClose, onSave,
}: {
  item: Partial<TripItem>;
  onClose: () => void;
  onSave: (patch: Partial<TripItem> & { trip_id: string; title: string }) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<TripItem>>(item);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.id ? "Edit item" : "New itinerary item"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={form.kind ?? "activity"}
                onValueChange={(v) => setForm({ ...form, kind: v as TripItem["kind"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lodging">Lodging</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.on_date ?? ""}
                onChange={(e) => setForm({ ...form, on_date: e.target.value || null })}
              />
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Sunrise hike at Craggy Pinnacle"
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={form.location ?? ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Blue Ridge Parkway"
            />
          </div>
          <div>
            <Label>Cost ($)</Label>
            <Input
              type="number"
              min={0}
              value={form.cost ?? 0}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.title?.trim() || !form.trip_id}
            onClick={() =>
              onSave({ ...form, trip_id: form.trip_id!, title: form.title!.trim() })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TripExpenseEditor({
  expense, onClose, onSave,
}: {
  expense: Partial<TripExpense>;
  onClose: () => void;
  onSave: (patch: Partial<TripExpense> & { trip_id: string; description: string; amount: number }) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<TripExpense>>(expense);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense.id ? "Edit expense" : "New expense"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Description</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Cabin nightly rate"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.amount ?? 0}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.incurred_on ?? new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, incurred_on: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category ?? "Other"}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.description?.trim() || !form.trip_id || !form.amount}
            onClick={() =>
              onSave({
                ...form,
                trip_id: form.trip_id!,
                description: form.description!.trim(),
                amount: Number(form.amount),
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
