## Knowledge Vault — Architecture Revision (Final)

Life-area library, template-only capture, connected data across Atlas, and a dedicated automation layer that turns Vault dates into real Tasks.

---

### 1. Data model

Extend `vault_entries`:
- `area` — `home | vehicles | travel | finance | outdoor | reference | unfiled` (Reference replaces General/Learning; Unfiled is the temporary inbox).
- `parent_id` (uuid, nullable self-ref) — attach warranties/documents/notes to a primary asset.
- `attachments` (jsonb: `{ label, url, kind }[]`).
- `related_trip_ids` (uuid[]) — alongside existing `related_project_id`, `related_task_ids`.
- `tags` stays `text[]` but is edited as reusable chips (see §7).

New table `vault_tags(user_id, name)` for the reusable chip vocabulary — indexed on `(user_id, name)`.

New table `vault_reminders` (dedicated, not JSONB):
```text
id uuid pk
user_id uuid
entry_id uuid → vault_entries(id) on delete cascade
label text
trigger_kind text            -- 'date' now; 'mileage' reserved for later
field_key text               -- which entry field holds the source date
lead_days int                -- fire N days before the field's date
repeat text                  -- 'none' | 'yearly' | 'monthly'
mileage_interval int         -- null for now; forward-compat
mileage_last_at int          -- null for now
active bool
next_fire_on date            -- computed on write
last_generated_cycle text    -- 'YYYY-MM-DD' of the source date consumed
last_generated_task_id uuid  -- soft link to tasks(id), nullable
created_at / updated_at
```

Hard uniqueness for idempotency:
```sql
UNIQUE (reminder_id, last_generated_cycle)  -- enforced via a helper log table:

CREATE TABLE vault_reminder_runs (
  reminder_id uuid REFERENCES vault_reminders(id) ON DELETE CASCADE,
  cycle_key text NOT NULL,            -- e.g. '2026-08-15' or 'mileage-45000'
  task_id uuid,
  ran_at timestamptz DEFAULT now(),
  PRIMARY KEY (reminder_id, cycle_key)
);
```
The processor `INSERT … ON CONFLICT DO NOTHING` into `vault_reminder_runs` before creating the task, guaranteeing at-most-once per cycle even under retries.

All new tables get RLS `auth.uid() = user_id` + explicit GRANTs to `authenticated` and `service_role`.

### 2. Templates (capture-only, in "+ New Entry")

Note, Guide (was Playbook), Vehicle, Home Asset, Contact, Document, Warranty.

**Project template is deferred** until the Projects workspace ships — projects will be first-class records there, not Vault duplicates. Existing playbook rows keep their value; UI relabels to "Guide".

Standalone Camping is folded into Notes/Guides under Outdoor (backfill preserves data).

### 3. Sidebar = life areas

```text
All entries · Pinned · Reminders
────────────────────────────────
Home         Vehicles
Travel       Finance
Outdoor      Reference
────────────────────────────────
Unfiled                       (inbox for entries missing an area)
```

Every entry has an area (default from template; user-editable). Template counts move into the "+ New Entry" popover.

### 4. Parent / child relationships

- Vehicle and Home Asset entries surface an **Attached items** section with quick-add for warranties, documents, notes, guides.
- The Warranty and Document dialogs default to **"Attach to an asset"** (searchable picker of Vehicles + Home Assets); "Save as standalone" remains available.
- Child cards show a `↳ 2019 4Runner` breadcrumb in lists and search.
- Deleting a parent prompts reassign or cascade.

### 5. Cross-module Related panel

Reuses existing link columns + new `related_trip_ids`. Cards surface "Linked: 3 tasks · 1 trip" when present. Vault entries never modify Trip/Task data — they only reference it.

### 6. Automation — Vault memory, Tasks engine

**Contract:** the Vault date is the source of truth. Reminders generate Tasks; they never write back into the entry's fields. Editing the source date recomputes `next_fire_on` on save. Deleting a reminder does not touch already-generated tasks.

**Reminder editor** lives next to each date field inside a "Reminders" section — "Remind me before this date" → lead-time + repeat + label.

**Processor:** new authenticated TanStack server route `/api/public/hooks/process-vault-reminders`:
- Verifies caller with `apikey: <anon-key>` header (pg_cron pattern) + a stored `VAULT_REMINDER_SECRET` bearer for defense in depth; both must match or 401.
- Loads active reminders where `next_fire_on <= today` in batches.
- For each: `INSERT INTO vault_reminder_runs(reminder_id, cycle_key)` — if it collides, skip (idempotent).
- On successful insert, create a task via `supabaseAdmin` with `source_module='vault'` and `source_ref={entry_id, reminder_id, cycle_key}`; store `task_id` back on the run row.
- Recompute `next_fire_on` for repeating reminders; one-off reminders flip `active=false`.
- Scheduled daily via `pg_cron` + `pg_net`.

**Forward-compat for mileage:** `trigger_kind='mileage'` with `mileage_interval` + `mileage_last_at` and a cycle_key like `mileage-45000`. Editor and processor branches on `trigger_kind`; UI hides mileage until Vehicle mileage lives on the Vehicle entry itself. No mileage work ships in this pass — schema only.

**Sidebar → Reminders view** lists all active reminders with next fire date, target entry, and last-generated task link.

### 7. UI — preserve the design, restructure the form

Same glass cards, dark theme, modal chrome. Deltas:

- **Vault landing (no search):** three stacked strips — **Pinned**, **Recently updated**, **Upcoming reminders (next 30 days)** — instead of dumping the full list. Full list stays one click away via "All entries".
- **Entry dialog** replaces the single scrolling form with tabs:
  - **Overview** — title, subtitle, area, tags, pinned.
  - **Details** — template-specific fields.
  - **Attachments** — file/link list with label + URL + kind.
  - **Related** — tasks, trips, project, peer entries.
  - **Reminders** — reminder rows tied to date fields.
- **Tag chips** — reusable across entries: chip picker with autocomplete from `vault_tags`, "+ Create tag" inline, click chip on a card to filter by that tag. Replaces the comma-separated string.
- **Cards** — add parent breadcrumb and a compact "linked" row when present; no other visual changes.

### 8. Search first (unchanged intent)

Search across title, subtitle, notes, tags, all field values, area, template, and parent title. Results grouped by area with template icon + breadcrumb. `/` focuses search anywhere on the Vault page.

---

### Out of scope this pass
- Projects template (returns when Projects workspace ships).
- Mileage-based reminders (schema-ready, UI deferred).
- Semantic/NL search — substring only.
- Google Photos / real file uploads — attachments are label + URL.

### Technical notes

- **Migration** adds columns to `vault_entries`, creates `vault_tags`, `vault_reminders`, `vault_reminder_runs`, with GRANTs + RLS + `updated_at` triggers. Backfills `area` from current template (`vehicle→vehicles`, `home→home`, `camping→outdoor`, `playbook→reference`, otherwise `unfiled`). Splits current comma tags into `vault_tags` rows per user.
- **Server route** `src/routes/api/public/hooks/process-vault-reminders.ts` — auth check, batched processing, ON CONFLICT idempotency, structured logs.
- **pg_cron** daily schedule via `supabase--insert` (not migration) posting to the stable `project--<id>.lovable.app` URL with `apikey` header.
- **`src/lib/atlas-data.ts`** — extend `VaultEntry`, add `useVaultChildren`, `useVaultReminders`, `useUpsertVaultReminder`, `useVaultTags`.
- **`src/lib/vault-templates.ts`** — drop Camping, rename Playbook → Guide, remove Project.
- **`src/routes/_authenticated/vault.tsx`** — area sidebar, tabbed entry dialog, tag chip picker, reminders section, landing strips, "+ New Entry" template popover, parent breadcrumbs.
- **Secrets** — add `VAULT_REMINDER_SECRET` via `secrets--add_secret`.

Ready to build.