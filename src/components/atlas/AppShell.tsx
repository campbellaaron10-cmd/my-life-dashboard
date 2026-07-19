import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Atmospheric background blobs */}
      <div className="atlas-atmosphere">
        <div
          className="absolute -top-[20%] -left-[10%] size-[60%] rounded-full bg-primary/10 blur-[120px] opacity-40"
          style={{ animation: "atlas-float 12s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[40%] -right-[10%] size-[50%] rounded-full bg-accent/10 blur-[120px] opacity-30"
          style={{ animation: "atlas-float 15s ease-in-out infinite reverse" }}
        />
      </div>

      <AppSidebar />

      <main className="relative z-10 flex-1 overflow-y-auto p-6 md:p-10">
        <div
          className="mx-auto max-w-[1600px]"
          style={{ animation: "atlas-fade-in 0.6s var(--ease-out-expo) both" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
