// Shared Google Maps JS API loader. Records last failure reason for dev display.

let mapsPromise: Promise<void> | null = null;
let lastError: string | null = null;

declare global {
  interface Window {
    google: any;
    __atlasInitMap?: () => void;
  }
}

export function getMapsLoadError() {
  return lastError;
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) ?? "";
  if (!key) {
    lastError = "Missing VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY (Google Maps connector not linked).";
    return Promise.reject(new Error(lastError));
  }

  mapsPromise = new Promise<void>((resolve, reject) => {
    window.__atlasInitMap = () => resolve();
    const s = document.createElement("script");
    // Load marker + places libraries so AdvancedMarkerElement and new Places autocomplete are available.
    const libs = "marker,places";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&loading=async&libraries=${libs}&callback=__atlasInitMap${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.onerror = () => {
      lastError = "Google Maps script failed to load. Check API key, billing, and allowed referrers.";
      reject(new Error(lastError));
    };
    // Detect Google's silent auth failures (referrer / billing / API not enabled).
    (window as any).gm_authFailure = () => {
      lastError = "Google Maps auth failure: key restricted, billing disabled, or Maps JS / Places API not enabled for this key/domain.";
    };
    document.head.appendChild(s);
  });
  return mapsPromise;
}
