import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/trips")({
  component: TripsLayout,
});

function TripsLayout() {
  return <Outlet />;
}