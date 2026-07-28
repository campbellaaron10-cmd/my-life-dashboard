import { useEffect, useRef } from "react";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  kind: "upcoming" | "past" | "place" | "bucket";
  onClick?: () => void;
};

declare global {
  interface Window {
    google: any;
    __atlasInitMap?: () => void;
  }
}

const KIND_COLOR: Record<MapPin["kind"], string> = {
  upcoming: "#60a5fa", // primary blue
  past: "#94a3b8",     // slate
  place: "#f59e0b",    // amber
  bucket: "#a78bfa",   // violet
};

let mapsPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID ?? "";
  if (!key) return Promise.reject(new Error("Google Maps key not configured"));
  mapsPromise = new Promise<void>((resolve, reject) => {
    window.__atlasInitMap = () => resolve();
    const s = document.createElement("script");
    const libs = "marker";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=${libs}&callback=__atlasInitMap${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function TripsMap({ pins, height = 420 }: { pins: MapPin[]; height?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMaps();
      } catch (e) {
        if (ref.current) {
          ref.current.innerHTML = `<div class="flex h-full items-center justify-center text-sm text-muted-foreground">Map unavailable</div>`;
        }
        return;
      }
      if (cancelled || !ref.current) return;
      const g = window.google.maps;
      const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
      if (!mapRef.current) {
        mapRef.current = new g.Map(ref.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          disableDefaultUI: true,
          zoomControl: true,
          styles: darkStyle,
          ...(mapId ? { mapId } : {}),
        });
      }
      // Clear old markers
      markersRef.current.forEach((m) => { m.map = null; m.setMap?.(null); });
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
          marker = new g.marker.AdvancedMarkerElement({
            map: mapRef.current, position, title: p.title, content: dot,
          });
        } else {
          marker = new g.Marker({
            map: mapRef.current, position, title: p.title,
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: KIND_COLOR[p.kind],
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeOpacity: 0.7,
              strokeWeight: 2,
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
    })();
    return () => { cancelled = true; };
  }, [pins]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div ref={ref} style={{ height }} className="w-full" />
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
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#111827" }] },
];
