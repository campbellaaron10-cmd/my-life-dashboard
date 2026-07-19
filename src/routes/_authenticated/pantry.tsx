import { createFileRoute } from "@tanstack/react-router";
import { Refrigerator } from "lucide-react";
import { ModulePlaceholder } from "@/components/atlas/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/pantry")({
  head: () => ({ meta: [{ title: "Pantry — Atlas" }] }),
  component: () => (
    <ModulePlaceholder
      icon={Refrigerator}
      title="Pantry"
      tagline="Track what's in the pantry, fridge, and freezer — with expiration alerts."
      upcoming={[
        "Items with quantity, purchase date, opened date, expiration date",
        "Storage locations: pantry, fridge, freezer",
        "Expiration alerts on the dashboard",
        "Schema-ready for the Recipes module in v1.1",
      ]}
    />
  ),
});
