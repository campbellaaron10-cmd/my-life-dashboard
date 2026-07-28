
-- 1. Extend vault_entries
ALTER TABLE public.vault_entries
  ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'unfiled',
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.vault_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_trip_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.vault_entries
  ADD CONSTRAINT vault_entries_area_check
  CHECK (area IN ('home','vehicles','travel','finance','outdoor','reference','unfiled'));

-- Backfill area from current template
UPDATE public.vault_entries SET area = CASE
  WHEN template = 'vehicle' THEN 'vehicles'
  WHEN template = 'home' THEN 'home'
  WHEN template = 'warranty' THEN 'home'
  WHEN template = 'camping' THEN 'outdoor'
  WHEN template IN ('document','contact','recipe_note','note') THEN 'reference'
  ELSE 'unfiled'
END
WHERE area = 'unfiled';

CREATE INDEX IF NOT EXISTS vault_entries_area_idx ON public.vault_entries(user_id, area);
CREATE INDEX IF NOT EXISTS vault_entries_parent_idx ON public.vault_entries(parent_id);

-- 2. vault_tags — reusable tag vocabulary per user
CREATE TABLE public.vault_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_tags TO authenticated;
GRANT ALL ON public.vault_tags TO service_role;
ALTER TABLE public.vault_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own vault tags"
  ON public.vault_tags FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed vault_tags from existing entry tags
INSERT INTO public.vault_tags (user_id, name)
SELECT DISTINCT ve.user_id, LOWER(TRIM(t)) AS name
FROM public.vault_entries ve, LATERAL unnest(ve.tags) AS t
WHERE TRIM(t) <> ''
ON CONFLICT (user_id, name) DO NOTHING;

-- 3. vault_reminders — automation layer
CREATE TABLE public.vault_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.vault_entries(id) ON DELETE CASCADE,
  label text NOT NULL,
  trigger_kind text NOT NULL DEFAULT 'date',
  field_key text,
  lead_days int NOT NULL DEFAULT 30,
  repeat text NOT NULL DEFAULT 'none',
  mileage_interval int,
  mileage_last_at int,
  active boolean NOT NULL DEFAULT true,
  next_fire_on date,
  last_generated_cycle text,
  last_generated_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vault_reminders_trigger_kind_check CHECK (trigger_kind IN ('date','mileage')),
  CONSTRAINT vault_reminders_repeat_check CHECK (repeat IN ('none','yearly','monthly'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_reminders TO authenticated;
GRANT ALL ON public.vault_reminders TO service_role;
ALTER TABLE public.vault_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own vault reminders"
  ON public.vault_reminders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX vault_reminders_due_idx ON public.vault_reminders(next_fire_on) WHERE active;
CREATE INDEX vault_reminders_entry_idx ON public.vault_reminders(entry_id);

CREATE TRIGGER vault_reminders_set_updated_at
  BEFORE UPDATE ON public.vault_reminders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. vault_reminder_runs — idempotency log
CREATE TABLE public.vault_reminder_runs (
  reminder_id uuid NOT NULL REFERENCES public.vault_reminders(id) ON DELETE CASCADE,
  cycle_key text NOT NULL,
  user_id uuid NOT NULL,
  task_id uuid,
  ran_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reminder_id, cycle_key)
);
GRANT SELECT ON public.vault_reminder_runs TO authenticated;
GRANT ALL ON public.vault_reminder_runs TO service_role;
ALTER TABLE public.vault_reminder_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reminder runs"
  ON public.vault_reminder_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX vault_reminder_runs_user_idx ON public.vault_reminder_runs(user_id, ran_at DESC);
