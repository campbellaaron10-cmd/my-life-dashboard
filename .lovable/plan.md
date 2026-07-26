## Phase 2 — Productivity & Knowledge

Goal: extend Atlas beyond Finances + Food into a connected productivity system where **Tasks** is the action engine, **Calendar** mirrors Google, **Trips** plans travel + places + bucket list, and the **Knowledge Vault** is the long-term reference layer. Modules share data via a small "action source" pattern so anything can generate a Task or Dashboard alert.

I'll build the four modules in order, each shippable on its own so you can start using them immediately.

---

### Stage 1 — Tasks (Action Center)

**Schema** (extend existing `tasks`, add supporting tables):
- Add columns to `tasks`: `category text`, `project_id uuid`, `recurrence_rule jsonb` (interval, unit, anchor), `next_due_on date`, `source_module text`, `source_ref jsonb`, `mileage_at_completion int` (for oil-change style rules).
- New `projects` table: id, user_id, name, description, color, status, created_at.
- New `task_attachments` table: id, task_id, name, url, mime, size_bytes. Storage bucket `attachments/`.
- `has_role`-scoped RLS + GRANTs on all new tables per project rules.

**UI (`/tasks` redesign):**
- Left rail: Inbox / Today / Upcoming / Overdue / Completed + Projects list + Categories chips.
- Center: task list with inline complete, priority pill, due date, recurrence badge, project tag.
- Right: task detail drawer (notes, attachments, recurrence editor, related items).
- Top: search + filter chips (priority, project, category, due window).
- Task form supports recurrence: "every N days/weeks/months", "every N miles", "annually on date", plus one-off due date.
- Completing a recurring task auto-creates the next occurrence via `next_due_on`.

**Cross-module action sources** (unified pattern — foundation for the rest):
- New helper `createTaskFromSource(source_module, source_ref, template)` used by Pantry (low stock), Recipes (missing ingredients — already partially there), Finance (transfer reminders), Weather (freeze/rain-triggered), Calendar (event prep), Trips (packing/pre-trip).
- Existing shopping-task generator refactored onto this pattern.

**Dashboard widget:** already exists; upgrades to show project tag, recurrence badge, and "Water ZZ plant tomorrow" style upcoming previews.

---

### Stage 2 — Calendar (Google Sync)

**Integration:** Google Calendar via the App User Connector pattern (each user connects their own Google account) — chosen so tokens are per-user and stored server-side encrypted.
- Setup uses `connector_app_user--connect_client` for the Google Calendar connector.
- Server functions `listEvents`, `createEvent`, `updateEvent` call the gateway with the app-user credential.
- Local cache table `calendar_events_cache` (id, google_id, calendar_id, title, start_ts, end_ts, all_day, location, description, updated_at) for fast dashboard reads; refreshed on load and on-demand.

**UI (`/calendar`):**
- Month / Week / Day views (headless components; use `date-fns` + custom grid to keep the Glass aesthetic).
- Today's Agenda strip on top.
- Tasks with `due_on` overlay on the calendar (read-only there, edited in Tasks).
- Birthdays & vacation countdowns pulled from a lightweight `personal_dates` table (name, date, kind, recurring).

**Dashboard widget:** Today's next 3 events + tomorrow's first event; Briefing surfaces "Dentist at 2 PM" style alerts.

---

### Stage 3 — Trips (Planner + Places + Bucket List)

Three linked sub-routes under `/trips`.

**Schema:**
- `trips`: id, user_id, name, destination, start_date, end_date, budget, status (planning/booked/active/past), notes, cover_image_url.
- `trip_items`: id, trip_id, kind (hotel/flight/restaurant/activity/reservation), title, when_ts, cost, url, confirmation, notes.
- `trip_packing`: id, trip_id, label, is_packed, category.
- `places`: id, user_id, name, category, lat, lon, google_maps_url, rating, notes, cost_estimate, travel_time_minutes, tags text[], photo_url.
- `bucket_list`: id, user_id, title, category, estimated_budget, estimated_vacation_days, notes, progress_pct, status.
- `bucket_places` join table linking a bucket item to saved `places` and generated `tasks`.

**UI:**
- `/trips` → list + countdown cards, click into detail with tabs: Overview / Reservations / Packing / Map / Photos / Related Tasks.
- `/trips/places` → map-first view (Google Maps JS API via a user-provided key or Mapbox — we'll decide when we hit this stage). Saved-place cards with rating stars, category filters, tag search.
- `/trips/bucket-list` → grid of dream goals with progress rings; each item can spawn tasks + save related places.

**Dashboard:** Nearest upcoming trip countdown + packing progress.

---

### Stage 4 — Knowledge Vault + Projects

**Schema:**
- `knowledge_notes`: id, user_id, title, body_md, category, tags text[], project_id (nullable), pinned, related_ids uuid[], updated_at.
- `knowledge_attachments`: id, note_id, name, url, mime.
- `restaurant_reviews` (specialization of notes): note_id, food_rating, vibes_rating, service_rating, price_range, custom_ratings jsonb.
- `projects` already exists from Stage 1 — extend with: budget, files, photos, progress_pct, related_note_ids uuid[].

**UI:**
- `/vault` → sidebar of categories + tags, center list, right editor (markdown with slash-menu for tables/checklists).
- `/vault/projects/:id` → project workspace: tasks (filtered from `tasks`), notes, budget rollup, photo grid, progress bar.
- Global search across notes + linked resources.
- Restaurant review template with rating dimensions you can customize.

**Dashboard:** Warranty/maintenance reminders (notes with `remind_on` field → auto-generated tasks 30 days before).

---

### Cross-cutting

- **Design language:** all modules reuse `GlassCard`, existing color tokens, `Select`/`Input`/`Button` shadcn primitives, and Finance/Food card patterns. No new fonts or palettes.
- **Data cohesion:** every new module either produces tasks (Pantry low, weather, trips) or consumes them (Calendar overlay, Project workspace, Bucket list). Dashboard Briefing gets a new input for each stage.
- **Privacy Mode:** trips + finance-touching notes respect Private/Guest guards.

---

### Technical notes

- Recurrence stored as `{ every: number, unit: "day"|"week"|"month"|"year"|"mile", anchor: "due"|"completed" }`. Mile-based ("every 5,000 mi") completes when user enters current mileage on the task; a vehicle profile in the Vault stores odometer.
- Google Calendar auth uses App User Connector; do NOT use App-level (workspace) OAuth — this is per-user data.
- Google Maps API key: I'll ask when we reach `/trips/places`; alternative is Mapbox — cheaper for personal use.
- File attachments use a Supabase storage bucket per surface (`attachments`, `trip-photos`, `vault-files`), all private with signed URLs.
- All new tables get RLS `auth.uid() = user_id` policies + explicit GRANT to authenticated/service_role.

---

### Suggested ship order

1. Tasks redesign + recurrence + projects (foundation).
2. Cross-module task generators refactor (small).
3. Calendar with Google sync + today's agenda.
4. Trips planner + packing + countdowns.
5. Places map view.
6. Bucket list.
7. Knowledge Vault base.
8. Vault ↔ Projects ↔ Tasks integration + Dashboard consolidation.

I'll pause between each stage so you can use it before we move to the next.
