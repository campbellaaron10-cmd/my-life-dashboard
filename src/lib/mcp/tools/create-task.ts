import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Add a task to the user's task list, optionally with a due date and priority.",
  inputSchema: {
    title: z.string().describe("What needs to be done."),
    notes: z.string().optional().describe("Extra detail."),
    due_on: z.string().optional().describe("Due date as an ISO date (YYYY-MM-DD)."),
    priority: z.string().optional().describe("Priority label, e.g. low, normal, high."),
    category: z.string().optional().describe("Free-form category label."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, notes, due_on, priority, category }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const userId = ctx.getUserId();
    if (!userId) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title,
        notes: notes ?? null,
        due_on: due_on ?? null,
        ...(priority ? { priority } : {}),
        category: category ?? null,
      })
      .select("id, title, due_on, priority, is_done")
      .single();
    if (error) return toolError(error.message);
    return jsonResult({ task: data });
  },
});
