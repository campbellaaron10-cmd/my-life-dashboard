import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Wallet,
  Refrigerator,
  CheckSquare,
  CloudSun,
  Shield,
  Users,
  Monitor,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePrivacyMode, type PrivacyMode } from "@/context/PrivacyMode";

const items = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Money", to: "/money", icon: Wallet },
  { title: "Food", to: "/pantry", icon: Refrigerator },
  { title: "Tasks", to: "/tasks", icon: CheckSquare },
  { title: "Weather", to: "/weather", icon: CloudSun },
] as const;

const modeMeta: Record<PrivacyMode, { label: string; icon: typeof Shield; hint: string }> = {
  private: { label: "Private", icon: Shield, hint: "All data visible" },
  guest: { label: "Guest", icon: Users, hint: "Finance hidden" },
  wall: { label: "Wall", icon: Monitor, hint: "Ambient display" },
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { mode, cycle } = usePrivacyMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const ModeIcon = modeMeta[mode].icon;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className="glass-panel sticky top-0 z-20 flex h-screen w-64 flex-col border-r border-white/5 p-6">
      <Link to="/" className="mb-10 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xl font-bold italic text-background">
          A
        </div>
        <span className="text-xl font-bold tracking-tight">ATLAS</span>
      </Link>

      <nav className="flex-1 space-y-1.5">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-base transition-all " +
                (active
                  ? "bg-white/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground")
              }
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={cycle}
        title={`Privacy: ${modeMeta[mode].hint}. Click to cycle.`}
        className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10"
      >
        <ModeIcon className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Privacy Mode
          </p>
          <p className="truncate text-sm font-medium">{modeMeta[mode].label}</p>
        </div>
      </button>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-accent/60 text-sm font-semibold text-background">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Operator</p>
            <p className="truncate text-xs text-muted-foreground">Sign out</p>
          </div>
          <LogOut className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </aside>
  );
}
