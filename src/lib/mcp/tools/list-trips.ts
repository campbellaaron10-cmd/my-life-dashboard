import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_trips",
  title: "List trips",
  description:
    "List the user's trips — upcoming plans and past memories with dates, destination, budget and notes.",
  inputSchema: {
    status: z
      .string()
      .optional()
      .describe("Filter by trip status, e.g. planning, upcoming, completed."),
    query: z.string().optional().describe("Free text matched against trip name and destination."),
    limit: z.number().int().optional().describe("Max rows (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("trips")
      .select("id, name, destination, start_date, end_date, status, budget, notes")
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (status) q = q.eq("status", status);
    if (query?.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`name.ilike.${term},destination.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) return toolError(error.message);
    return jsonResult({ trips: data ?? [] });
  },
});
