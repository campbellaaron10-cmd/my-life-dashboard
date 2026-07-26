import {
  Refrigerator, Plane, Wallet, CloudSun, CalendarDays, BookLock,
  ChefHat, Sparkles, type LucideIcon,
} from "lucide-react";

export type TaskSource =
  | "pantry" | "recipes" | "finance" | "weather" | "calendar" | "trips" | "vault";

export const SOURCE_META: Record<TaskSource, { label: string; icon: LucideIcon; color: string; bg: string; border: string; to: string }> = {
  pantry:   { label: "Pantry",   icon: Refrigerator, color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", to: "/pantry" },
  recipes:  { label: "Recipes",  icon: ChefHat,      color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   to: "/recipes" },
  finance:  { label: "Finance",  icon: Wallet,       color: "text-sky-300",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     to: "/money" },
  weather:  { label: "Weather",  icon: CloudSun,     color: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    to: "/weather" },
  calendar: { label: "Calendar", icon: CalendarDays, color: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  to: "/calendar" },
  trips:    { label: "Trips",    icon: Plane,        color: "text-fuchsia-300", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", to: "/trips" },
  vault:    { label: "Vault",    icon: BookLock,     color: "text-indigo-300",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  to: "/vault" },
};

export function getSourceMeta(source: string | null | undefined) {
  if (!source) return null;
  return (SOURCE_META as Record<string, typeof SOURCE_META[TaskSource]>)[source] ?? null;
}

/** Compact source badge for task rows and lists. */
export function SourceBadge({ source, className = "" }: { source: string | null | undefined; className?: string }) {
  const meta = getSourceMeta(source);
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${meta.color} ${meta.bg} ${meta.border} ${className}`}
      title={`Auto-generated from ${meta.label}`}
    >
      <Icon className="size-2.5" />
      {meta.label}
    </span>
  );
}

/** Full "From X" pill for detail panels. */
export function SourcePill({ source }: { source: string | null | undefined }) {
  const meta = getSourceMeta(source);
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted-foreground">
        <Sparkles className="size-3" /> Manually created
      </span>
    );
  }
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${meta.color} ${meta.bg} ${meta.border}`}>
      <Icon className="size-3.5" /> From {meta.label}
    </span>
  );
}

export const PRIORITY_META = {
  low:    { label: "Low",    dot: "bg-slate-400",  ring: "ring-slate-400/40",  text: "text-slate-400" },
  normal: { label: "Medium", dot: "bg-primary",    ring: "ring-primary/40",    text: "text-primary" },
  high:   { label: "High",   dot: "bg-warning",    ring: "ring-warning/50",    text: "text-warning" },
} as const;

export const TASK_CATEGORIES = [
  "Home", "Vehicle", "Plants", "Health", "Finance",
  "Errands", "Work", "Personal", "Maintenance", "Learning",
] as const;
