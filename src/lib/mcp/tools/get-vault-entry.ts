import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_vault_entry",
  title: "Get vault entry",
  description:
    "Read one Knowledge Vault entry in full, including its structured fields, child entries (warranties, documents) and reminders.",
  inputSchema: { id: z.string().describe("Vault entry id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const { data: entry, error } = await supabase
      .from("vault_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return toolError(error.message);
    if (!entry) return toolError(`No vault entry found with id ${id}.`);

    const [children, reminders] = await Promise.all([
      supabase
        .from("vault_entries")
        .select("id, title, subtitle, template, area, fields")
        .eq("parent_id", id)
        .eq("is_archived", false),
      supabase
        .from("vault_reminders")
        .select("id, label, trigger_kind, repeat, lead_days, next_fire_on, active")
        .eq("entry_id", id),
    ]);

    return jsonResult({
      entry,
      children: children.data ?? [],
      reminders: reminders.data ?? [],
    });
  },
});
