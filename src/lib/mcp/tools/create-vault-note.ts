import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_vault_note",
  title: "Create vault note",
  description:
    "Save a new note or guide into the Knowledge Vault so it becomes long-term memory. Use search_vault first to avoid duplicating an existing entry.",
  inputSchema: {
    title: z.string().describe("Short authoritative title, e.g. 'HVAC filter size'."),
    notes: z.string().optional().describe("Body of the note or procedure, markdown allowed."),
    subtitle: z.string().optional().describe("One-line summary shown on the card."),
    area: z
      .string()
      .optional()
      .describe("Life area: home, vehicles, travel, finance, outdoor, projects, reference."),
    template: z.string().optional().describe("Template: note or guide. Defaults to note."),
    tags: z.array(z.string()).optional().describe("Reusable tag chips."),
    parent_id: z.string().optional().describe("Attach this entry to a parent vault entry."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, notes, subtitle, area, template, tags, parent_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const userId = ctx.getUserId();
    if (!userId) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("vault_entries")
      .insert({
        user_id: userId,
        title,
        notes: notes ?? null,
        subtitle: subtitle ?? null,
        area: area ?? "reference",
        template: template ?? "note",
        tags: tags ?? [],
        parent_id: parent_id ?? null,
      })
      .select("id, title, area, template")
      .single();
    if (error) return toolError(error.message);
    return jsonResult({ entry: data });
  },
});
