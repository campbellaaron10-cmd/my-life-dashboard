import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { loadGoogleMaps, getMapsLoadError } from "./googleMapsLoader";

export type PickedPlace = {
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  maps_url: string;
};

type Suggestion = {
  placeId: string;
  main: string;
  secondary: string;
  prediction: any;
};

type Props = {
  value: string;
  onChange: (text: string) => void;
  onPick: (place: PickedPlace) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  verified?: boolean;
};

export function PlaceAutocomplete({
  value, onChange, onPick, onClear, placeholder, autoFocus, className, verified,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const debounceRef = useRef<number | null>(null);

  const canQuery = useMemo(() => (value ?? "").trim().length >= 2 && !verified, [value, verified]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    if (!canQuery) { setSuggestions([]); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        await loadGoogleMaps();
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          await window.google.maps.importLibrary("places");
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions: sug } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value.trim(),
          sessionToken: sessionRef.current,
        });
        const mapped: Suggestion[] = (sug ?? [])
          .filter((s: any) => s.placePrediction)
          .slice(0, 6)
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            main: s.placePrediction.mainText?.toString?.() ?? s.placePrediction.text?.toString?.() ?? "",
            secondary: s.placePrediction.secondaryText?.toString?.() ?? "",
            prediction: s.placePrediction,
          }));
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
      } catch (e: any) {
        setSuggestions([]);
        setError(e?.message ?? getMapsLoadError() ?? "Places unavailable");
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [value, canQuery]);

  async function pick(s: Suggestion) {
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
      const loc = place.location;
      const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
      const name = place.displayName ?? s.main;
      const address = place.formattedAddress ?? [s.main, s.secondary].filter(Boolean).join(", ");
      const picked: PickedPlace = {
        google_place_id: place.id ?? s.placeId,
        name,
        address,
        lat: Number(lat),
        lng: Number(lng),
        maps_url: `https://www.google.com/maps/place/?q=place_id:${place.id ?? s.placeId}`,
      };
      onChange(name);
      onPick(picked);
      setOpen(false);
      sessionRef.current = null; // new session after selection
    } catch (e: any) {
      setError(e?.message ?? "Could not load place details");
    }
  }

  return (
    <div ref={boxRef} className={className ?? "relative"}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); onClear?.(); }}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          placeholder={placeholder ?? "Search destination…"}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {verified && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-300">
            Verified
          </span>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-white/10 bg-background/95 py-1 shadow-2xl backdrop-blur"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary/80" />
                <span className="min-w-0">
                  <span className="block truncate">{s.main}</span>
                  {s.secondary && (
                    <span className="block truncate text-[11px] text-muted-foreground">{s.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && !open && (
        <p className="mt-1 text-[11px] text-muted-foreground">Searching…</p>
      )}
      {error && (
        <p className="mt-1 text-[11px] text-rose-300">Places unavailable — free-text will save as unverified. <span className="opacity-60">{error}</span></p>
      )}
    </div>
  );
}
