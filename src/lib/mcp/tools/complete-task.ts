import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "complete_task",
  title: "Complete task",
  description: "Mark a task as done (or reopen it) by task id.",
  inputSchema: {
    id: z.string().describe("Task id."),
    done: z.boolean().optional().describe("Set false to reopen the task. Default true."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  handler: async ({ id, done }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const isDone = done ?? true;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tasks")
      .update({ is_done: isDone })
      .eq("id", id)
      .select("id, title, is_done")
      .maybeSingle();
    if (error) return toolError(error.message);
    if (!data) return toolError(`No task found with id ${id}.`);
    return jsonResult({ task: data });
  },
});
