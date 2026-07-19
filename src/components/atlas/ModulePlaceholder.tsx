import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface Props {
  icon: LucideIcon;
  title: string;
  tagline: string;
  upcoming: string[];
}

export function ModulePlaceholder({ icon: Icon, title, tagline, upcoming }: Props) {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Module
          </p>
          <h1 className="flex items-center gap-4 text-4xl font-bold tracking-tight md:text-5xl">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur">
              <Icon className="size-6 text-primary" />
            </span>
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">{tagline}</p>
        </div>
      </header>

      <GlassCard>
        <h2 className="mb-6 text-xl font-semibold">Coming next</h2>
        <ul className="space-y-3">
          {upcoming.map((u) => (
            <li key={u} className="flex items-start gap-3 text-base text-muted-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{u}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-white/5 pt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Ready to build — ask Atlas to activate this module.
        </p>
      </GlassCard>
    </div>
  );
}
