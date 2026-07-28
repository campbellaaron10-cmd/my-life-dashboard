import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily processor that turns due Vault reminders into real Tasks.
 *
 * Contract:
 * - Vault entry dates are the source of truth. This route never mutates entry fields.
 * - For every active reminder with `next_fire_on <= today`, insert a row into
 *   `vault_reminder_runs (reminder_id, cycle_key)`. That primary key makes the
 *   operation idempotent — retries and overlapping cron ticks cannot double-create.
 * - On successful run insert, create a task tagged `source_module='vault'` and
 *   store the resulting task id back on the reminder + run rows.
 * - Recompute `next_fire_on` for repeating reminders; flip one-off reminders to inactive.
 *
 * Auth: requires BOTH the Supabase anon `apikey` header (pg_cron pattern) AND a
 * `x-vault-reminder-secret` header matching the `VAULT_REMINDER_SECRET` env value.
 */

export const Route = createFileRoute("/api/public/hooks/process-vault-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = request.headers.get("apikey");
        const secret = request.headers.get("x-vault-reminder-secret");
        const expectedAnon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        const expectedSecret = process.env.VAULT_REMINDER_SECRET;
        if (!anon || !expectedAnon || anon !== expectedAnon) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!expectedSecret || secret !== expectedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);

        const { data: due, error } = await supabaseAdmin
          .from("vault_reminders")
          .select("*, entry:vault_entries!inner(id,title,fields,area,user_id)")
          .eq("active", true)
          .lte("next_fire_on", today)
          .limit(200);
        if (error) {
          console.error("[process-vault-reminders] load error", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        let created = 0;
        let skipped = 0;

        for (const r of due ?? []) {
          const reminder = r as typeof r & {
            entry: { id: string; title: string; fields: Record<string, unknown>; area: string; user_id: string };
          };
          if (reminder.trigger_kind !== "date") { skipped++; continue; }
          const sourceDate = reminder.field_key
            ? (reminder.entry.fields?.[reminder.field_key] as string | undefined)
            : undefined;
          if (!sourceDate) { skipped++; continue; }
          const cycleKey = sourceDate;

          // Idempotency guard.
          const { error: runErr } = await supabaseAdmin
            .from("vault_reminder_runs")
            .insert({
              reminder_id: reminder.id,
              cycle_key: cycleKey,
              user_id: reminder.user_id,
            });
          if (runErr) {
            // 23505 unique violation → already processed for this cycle.
            if ((runErr as { code?: string }).code === "23505") { skipped++; continue; }
            console.error("[process-vault-reminders] run insert error", runErr);
            continue;
          }

          // Create the actual task.
          const dueOn = sourceDate;
          const { data: task, error: taskErr } = await supabaseAdmin
            .from("tasks")
            .insert({
              user_id: reminder.user_id,
              title: reminder.label,
              notes: `From Vault: ${reminder.entry.title}`,
              priority: "normal",
              due_on: dueOn,
              is_done: false,
              sort_order: 0,
              kind: "general",
              source_module: "vault",
              source_ref: {
                entry_id: reminder.entry.id,
                reminder_id: reminder.id,
                cycle_key: cycleKey,
              } as never,
            })
            .select("id")
            .single();
          if (taskErr || !task) {
            console.error("[process-vault-reminders] task insert error", taskErr);
            continue;
          }

          created++;

          // Recompute next_fire_on and update the reminder + run.
          let nextFireOn: string | null = null;
          if (reminder.repeat === "yearly" || reminder.repeat === "monthly") {
            const d = new Date(sourceDate + "T00:00:00");
            if (reminder.repeat === "yearly") d.setFullYear(d.getFullYear() + 1);
            else d.setMonth(d.getMonth() + 1);
            const nextSource = d.toISOString().slice(0, 10);
            const fire = new Date(d);
            fire.setDate(fire.getDate() - (reminder.lead_days ?? 30));
            nextFireOn = fire.toISOString().slice(0, 10);
            // NOTE: we do not write nextSource back to the entry — Vault date is source of truth.
            // Repeating date-based reminders keep advancing off the ORIGINAL entry date +N years.
            // The user must update the entry date when the real-world event slips.
            void nextSource;
          }

          await supabaseAdmin
            .from("vault_reminders")
            .update({
              next_fire_on: nextFireOn,
              active: nextFireOn !== null,
              last_generated_cycle: cycleKey,
              last_generated_task_id: task.id,
            })
            .eq("id", reminder.id);

          await supabaseAdmin
            .from("vault_reminder_runs")
            .update({ task_id: task.id })
            .eq("reminder_id", reminder.id)
            .eq("cycle_key", cycleKey);
        }

        return Response.json({ ok: true, checked: due?.length ?? 0, created, skipped });
      },
    },
  },
});
