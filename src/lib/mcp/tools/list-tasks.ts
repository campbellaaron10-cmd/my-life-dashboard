import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List the user's tasks — the action engine. Filter by completion, due date window, or free text.",
  inputSchema: {
    include_done: z.boolean().optional().describe("Include completed tasks (default false)."),
    due_before: z.string().optional().describe("Only tasks due on or before this ISO date."),
    query: z.string().optional().describe("Free text matched against task title."),
    limit: z.number().int().optional().describe("Max rows (default 30, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_done, due_before, query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("tasks")
      .select("id, title, notes, is_done, due_on, priority, category")
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(Math.min(Math.max(limit ?? 30, 1), 100));

    if (!include_done) q = q.eq("is_done", false);
    if (due_before) q = q.lte("due_on", due_before);
    if (query?.trim()) q = q.ilike("title", `%${query.trim()}%`);

    const { data, error } = await q;
    if (error) return toolError(error.message);
    return jsonResult({ tasks: data ?? [] });
  },
});
