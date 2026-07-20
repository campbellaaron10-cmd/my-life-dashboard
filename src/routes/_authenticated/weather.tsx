import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, MapPin, Search } from "lucide-react";
import { GlassCard } from "@/components/atlas/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSavedLocation, useWeather, weatherCondition, geocodeCity, type LocationCoords } from "@/hooks/useWeather";

export const Route = createFileRoute("/_authenticated/weather")({
  head: () => ({ meta: [{ title: "Weather — Atlas" }] }),
  component: WeatherPage,
});

function iconFor(code: number, isDay = true) {
  const c = weatherCondition(code).icon;
  const cls = "size-full";
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "storm") return <CloudLightning className={cls} />;
  if (c === "cloud") return <Cloud className={cls} />;
  return <Sun className={`${cls} ${isDay ? "text-primary" : "text-muted-foreground"}`} />;
}

function WeatherPage() {
  const { location, save } = useSavedLocation();
  const weather = useWeather(location);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Forecast</p>
          <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight">
            <MapPin className="size-6 text-primary" />
            {location.label ?? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`}
          </h1>
        </div>
        <LocationPicker onPick={save} />
      </header>

      {weather.isLoading ? (
        <GlassCard><p className="text-muted-foreground">Loading forecast…</p></GlassCard>
      ) : weather.error ? (
        <GlassCard><p className="text-warning">Couldn't load weather.</p></GlassCard>
      ) : weather.data ? (
        <>
          {/* Current */}
          <GlassCard className="flex flex-wrap items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="size-24">{iconFor(weather.data.now.code, weather.data.now.isDay)}</div>
              <div>
                <p className="text-7xl font-light tracking-tighter">{Math.round(weather.data.now.temperature)}°</p>
                <p className="text-xl text-muted-foreground">{weatherCondition(weather.data.now.code).label}</p>
                <p className="mt-1 text-sm text-muted-foreground">Feels like {Math.round(weather.data.now.apparent)}°</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Stat icon={Wind} label="Wind" value={`${Math.round(weather.data.now.wind)} mph`} />
              <Stat icon={Droplets} label="Humidity" value={`${weather.data.now.humidity}%`} />
            </div>
          </GlassCard>

          {/* Hourly */}
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold">Next 24 hours</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {weather.data.hourly.map((h) => {
                const d = new Date(h.time);
                return (
                  <div key={h.time} className="flex min-w-[72px] flex-col items-center rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      {d.toLocaleTimeString("en-US", { hour: "numeric" })}
                    </p>
                    <div className="my-2 size-6 text-primary">{iconFor(h.code)}</div>
                    <p className="font-mono text-lg font-semibold">{Math.round(h.temp)}°</p>
                    {h.precipProb > 15 && (
                      <p className="mt-1 font-mono text-[10px] text-accent">{h.precipProb}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Daily */}
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold">7-day outlook</h2>
            <div className="space-y-2">
              {weather.data.daily.map((d, i) => {
                const date = new Date(d.date);
                return (
                  <div key={d.date} className="grid grid-cols-[100px_40px_1fr_100px] items-center gap-4 rounded-xl px-4 py-3 hover:bg-white/5">
                    <span className="font-medium">{i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                    <div className="size-6 text-primary">{iconFor(d.code)}</div>
                    <span className="text-sm text-muted-foreground">
                      {weatherCondition(d.code).label}
                      {d.precipProb > 15 ? ` · ${d.precipProb}% precip` : ""}
                    </span>
                    <span className="text-right font-mono">
                      <span className="font-semibold">{Math.round(d.tempMax)}°</span>
                      <span className="ml-2 text-muted-foreground">{Math.round(d.tempMin)}°</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wind; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-5 text-muted-foreground" />
      <div>
        <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className="font-mono text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

function LocationPicker({ onPick }: { onPick: (l: LocationCoords) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationCoords[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    const r = await geocodeCity(query);
    setResults(r);
    setBusy(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onPick({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Current location" }),
      () => alert("Couldn't get your location."),
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Search city…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <Button type="submit" size="icon" disabled={busy}><Search className="size-4" /></Button>
        <Button type="button" variant="secondary" onClick={useMyLocation}><MapPin className="mr-1 size-4" /> Me</Button>
      </form>
      {results.length > 0 && (
        <div className="glass-panel w-72 rounded-xl p-2">
          {results.map((r) => (
            <button
              key={`${r.lat}-${r.lon}`}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
              onClick={() => { onPick(r); setResults([]); setQuery(""); }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
