import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { ModulePlaceholder } from "@/components/atlas/ModulePlaceholder";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Atlas" }] }),
  component: () => (
    <ModulePlaceholder
      icon={CheckSquare}
      title="Tasks"
      tagline="A simple, powerful task manager built for the dashboard glance."
      upcoming={[
        "Recurring tasks with due dates",
        "Projects and priority levels",
        "Dashboard widget for today's protocols",
        "Google Calendar sync (Future)",
      ]}
    />
  ),
});
