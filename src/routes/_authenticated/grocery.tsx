import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import { ModulePlaceholder } from "@/components/atlas/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/grocery")({
  head: () => ({ meta: [{ title: "Grocery — Atlas" }] }),
  component: () => (
    <ModulePlaceholder
      icon={ShoppingBasket}
      title="Grocery"
      tagline="A shared shopping list that talks to your pantry."
      upcoming={[
        "Checkboxes, categories, quick-add",
        "Recurring purchases",
        "Auto-deduct into pantry inventory after shopping",
        "Auto-add missing ingredients from recipes (v1.1)",
      ]}
    />
  ),
});
