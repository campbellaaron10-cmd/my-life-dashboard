import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/atlas/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/money")({
  head: () => ({ meta: [{ title: "Money — Atlas" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Wallet}
      title="Money"
      tagline="Accounts, budgets, cash flow, and net worth — all in one place."
      upcoming={[
        "Manual transactions across Regions checking, Fidelity, and 401(k)",
        "Budget categories: ESS, FUN, STS, VAC, LTS, FED with rollover",
        "Spending charts, net-worth graph, cash-flow view",
        "Plaid integration for automatic transaction imports",
      ]}
    />
  ),
});
