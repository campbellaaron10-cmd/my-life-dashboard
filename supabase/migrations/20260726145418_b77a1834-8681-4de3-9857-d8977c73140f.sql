CREATE TABLE public.vault_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  subtitle text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  related_task_ids uuid[] NOT NULL DEFAULT '{}',
  related_project_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_entries TO authenticated;
GRANT ALL ON public.vault_entries TO service_role;

ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own vault_entries" ON public.vault_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX vault_entries_user_template_idx ON public.vault_entries (user_id, template);
CREATE INDEX vault_entries_user_pinned_idx ON public.vault_entries (user_id, is_pinned) WHERE is_pinned;

CREATE TRIGGER vault_entries_set_updated_at
  BEFORE UPDATE ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();