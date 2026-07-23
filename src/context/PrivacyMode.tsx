import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PrivacyMode = "private" | "guest";

/**
 * Widget-level visibility policy.
 *  - "private-only": only visible in Private mode (finance detail, activity feed…)
 *  - "guest-safe":   visible in every mode (tasks, weather, pantry, calendar…)
 */
export type Sensitivity = "private-only" | "guest-safe";

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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "private" || saved === "guest") {
      setModeState(saved);
    } else if (saved === "wall") {
      // Legacy: Wall mode has been removed — fall back to Guest.
      setModeState("guest");
      localStorage.setItem(STORAGE_KEY, "guest");
    }
  }, []);

  const setMode = useCallback((m: PrivacyMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const cycle = useCallback(() => {
    setModeState((prev) => {
      const next: PrivacyMode = prev === "private" ? "guest" : "private";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const canShow = useCallback(
    (s: Sensitivity) => {
      if (s === "guest-safe") return true;
      if (s === "private-only") return mode === "private";
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
