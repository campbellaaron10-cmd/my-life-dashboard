import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, getMapsLoadError } from "./googleMapsLoader";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  kind: "upcoming" | "past" | "place" | "bucket";
  onClick?: () => void;
};

const KIND_COLOR: Record<MapPin["kind"], string> = {
  upcoming: "#60a5fa",
  past: "#94a3b8",
  place: "#f59e0b",
  bucket: "#a78bfa",
};

export function TripsMap({ pins, height = 420 }: { pins: MapPin[]; height?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !ref.current) return;
        const g = window.google.maps;
        const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
        if (!mapRef.current) {
          mapRef.current = new g.Map(ref.current, {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            ...(mapId ? { mapId } : { styles: darkStyle }),
          });
        }
        setReady(true);
      } catch (e: any) {
        setFailed(e?.message ?? getMapsLoadError() ?? "Google Maps failed to load");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Update markers when pins change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = window.google.maps;
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

    markersRef.current.forEach((m) => { try { m.map = null; } catch {} try { m.setMap?.(null); } catch {} });
    markersRef.current = [];

    const bounds = new g.LatLngBounds();
    let count = 0;
    for (const p of pins) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const position = { lat: p.lat, lng: p.lng };
      let marker: any;
      if (mapId && g.marker?.AdvancedMarkerElement) {
        const dot = document.createElement("div");
        dot.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${KIND_COLOR[p.kind]};box-shadow:0 0 0 2px rgba(255,255,255,.6),0 2px 6px rgba(0,0,0,.5);cursor:pointer;`;
        marker = new g.marker.AdvancedMarkerElement({ map: mapRef.current, position, title: p.title, content: dot });
      } else {
        marker = new g.Marker({
          map: mapRef.current, position, title: p.title,
          icon: {
            path: g.SymbolPath.CIRCLE, scale: 7,
            fillColor: KIND_COLOR[p.kind], fillOpacity: 1,
            strokeColor: "#ffffff", strokeOpacity: 0.7, strokeWeight: 2,
          },
        });
      }
      if (p.onClick) marker.addListener?.("click", p.onClick);
      markersRef.current.push(marker);
      bounds.extend(position);
      count++;
    }
    if (count > 1) mapRef.current.fitBounds(bounds, 60);
    else if (count === 1) { mapRef.current.setCenter(bounds.getCenter()); mapRef.current.setZoom(6); }
    else { mapRef.current.setCenter({ lat: 20, lng: 0 }); mapRef.current.setZoom(2); }
  }, [pins, ready]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div ref={ref} style={{ height }} className="w-full" />

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/80 p-4 text-center text-sm">
          <p className="font-medium">Map unavailable</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Check that the Google Maps browser key is configured, billing enabled, and Maps JavaScript + Places APIs allowed for this domain.
          </p>
          {import.meta.env.DEV && (
            <p className="mt-1 max-w-md font-mono text-[10px] text-rose-300">{failed}</p>
          )}
        </div>
      )}

      {!failed && ready && pins.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            Add a verified destination to place your first pin.
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest">
        {(["upcoming","past","place","bucket"] as const).map((k) => (
          <span key={k} className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2 py-1 backdrop-blur">
            <span className="size-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

const darkStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }, { weight: 3 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  // Bright country labels
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#f8fafc" }, { weight: 700 }] },
  { featureType: "administrative.country", elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }, { weight: 4 }] },
  // Visible country borders
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#64748b" }, { weight: 1.2 }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#334155" }, { weight: 0.6 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#111827" }] },
];

