import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Refrigerator,
  ShoppingBasket,
  CheckSquare,
} from "lucide-react";

const items = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Money", to: "/money", icon: Wallet },
  { title: "Pantry", to: "/pantry", icon: Refrigerator },
  { title: "Grocery", to: "/grocery", icon: ShoppingBasket },
  { title: "Tasks", to: "/tasks", icon: CheckSquare },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="glass-panel sticky top-0 z-20 flex h-screen w-64 flex-col border-r border-white/5 p-6">
      <Link to="/" className="mb-12 flex items-center gap-3 px-2">
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

      <div className="mt-auto rounded-2xl border border-white/5 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-accent/60 text-sm font-semibold text-background">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Aaron</p>
            <p className="truncate text-xs text-muted-foreground">System Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
