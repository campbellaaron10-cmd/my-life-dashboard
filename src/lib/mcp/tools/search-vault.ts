import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, supabaseForUser, toolError, unauthenticated } from "../supabase";

export default defineTool({
  name: "search_vault",
  title: "Search knowledge vault",
  description:
    "Search the user's Knowledge Vault (long-term memory: home, vehicles, travel, finance, reference notes, guides, documents, warranties) by free text, life area, or template.",
  inputSchema: {
    query: z.string().optional().describe("Free text matched against title, subtitle and notes."),
    area: z
      .string()
      .optional()
      .describe("Life area filter, e.g. home, vehicles, travel, finance, outdoor, reference."),
    template: z.string().optional().describe("Template filter, e.g. note, vehicle, document."),
    limit: z.number().int().optional().describe("Max rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, area, template, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("vault_entries")
      .select("id, title, subtitle, area, template, tags, notes, is_pinned, parent_id, updated_at")
      .eq("is_archived", false)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (area) q = q.eq("area", area);
    if (template) q = q.eq("template", template);
    if (query?.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`title.ilike.${term},subtitle.ilike.${term},notes.ilike.${term}`);
    }

    const { data, error } = await q;
    if (error) return toolError(error.message);
    return jsonResult({ entries: data ?? [] });
  },
});
