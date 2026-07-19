import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/atlas/AppShell";
import { PrivacyModeProvider } from "@/context/PrivacyMode";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <PrivacyModeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </PrivacyModeProvider>
  ),
});
