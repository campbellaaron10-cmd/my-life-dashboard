import { Link, useRouterState } from "@tanstack/react-router";
import { Refrigerator, ChefHat, Utensils } from "lucide-react";

const tabs = [
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/foods", label: "Food Library", icon: Utensils },
] as const;

export function FoodTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-white/5 bg-white/5 p-1">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to);
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all " +
              (active ? "bg-white/10 font-medium text-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            <Icon className="size-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
