import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_pantry_items",
  title: "List pantry items",
  description:
    "List what is in the user's kitchen right now, optionally only items expiring within a number of days.",
  inputSchema: {
    expiring_within_days: z
      .number()
      .int()
      .optional()
      .describe("Only items with an expiry date within this many days."),
    limit: z.number().int().optional().describe("Max rows (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ expiring_within_days, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("pantry_items")
      .select("id, name, quantity, unit, location, expires_on")
      .eq("is_consumed", false)
      .order("expires_on", { ascending: true, nullsFirst: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (typeof expiring_within_days === "number") {
      const horizon = new Date(Date.now() + expiring_within_days * 86_400_000)
        .toISOString()
        .slice(0, 10);
      q = q.not("expires_on", "is", null).lte("expires_on", horizon);
    }

    const { data, error } = await q;
    if (error) return toolError(error.message);
    return jsonResult({ items: data ?? [] });
  },
});
