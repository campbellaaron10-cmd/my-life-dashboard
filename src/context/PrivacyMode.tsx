import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PrivacyMode = "private" | "guest" | "wall";

/**
 * Widget-level visibility policy.
 *  - "private-only": only visible in Private mode (finance detail, activity feed…)
 *  - "guest-safe":   visible in every mode (tasks, weather, pantry, calendar…)
 *  - "wall-only":    reserved for future wall-display large-format widgets
 */
export type Sensitivity = "private-only" | "guest-safe" | "wall-only";

interface PrivacyContextValue {
  mode: PrivacyMode;
  setMode: (m: PrivacyMode) => void;
  cycle: () => void;
  canShow: (sensitivity: Sensitivity) => boolean;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);
const STORAGE_KEY = "atlas.privacyMode";

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PrivacyMode>("private");

  // Hydrate from localStorage after mount (avoids SSR mismatch — provider is client-only anyway).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "private" || saved === "guest" || saved === "wall") {
      setModeState(saved);
    }
  }, []);

  const setMode = useCallback((m: PrivacyMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const cycle = useCallback(() => {
    setModeState((prev) => {
      const next: PrivacyMode = prev === "private" ? "guest" : prev === "guest" ? "wall" : "private";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const canShow = useCallback(
    (s: Sensitivity) => {
      if (s === "guest-safe") return true;
      if (s === "private-only") return mode === "private";
      if (s === "wall-only") return mode === "wall";
      return true;
    },
    [mode],
  );

  const value = useMemo(() => ({ mode, setMode, cycle, canShow }), [mode, setMode, cycle, canShow]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacyMode() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacyMode must be used inside <PrivacyModeProvider>");
  return ctx;
}

/**
 * Gate a widget by sensitivity. When hidden, an optional `fallback` renders
 * a guest-safe replacement so the dashboard grid never has empty cells.
 */
export function PrivacyGuard({
  sensitivity,
  fallback,
  children,
}: {
  sensitivity: Sensitivity;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { canShow } = usePrivacyMode();
  if (canShow(sensitivity)) return <>{children}</>;
  return <>{fallback ?? null}</>;
}
