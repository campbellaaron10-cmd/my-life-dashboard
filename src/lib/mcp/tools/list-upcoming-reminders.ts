import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_upcoming_reminders",
  title: "List upcoming reminders",
  description:
    "List Knowledge Vault reminders (warranty expirations, renewals, filter changes, maintenance) firing within a number of days.",
  inputSchema: {
    within_days: z.number().int().optional().describe("Look-ahead window in days, default 60."),
    limit: z.number().int().optional().describe("Max rows (default 50, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ within_days, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const days = Math.min(Math.max(within_days ?? 60, 1), 3650);
    const horizon = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("vault_reminders")
      .select("id, label, trigger_kind, repeat, lead_days, next_fire_on, entry_id")
      .eq("active", true)
      .not("next_fire_on", "is", null)
      .lte("next_fire_on", horizon)
      .order("next_fire_on", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 50, 1), 100));

    if (error) return toolError(error.message);
    return jsonResult({ reminders: data ?? [], horizon });
  },
});
