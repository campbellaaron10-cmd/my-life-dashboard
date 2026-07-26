CREATE TYPE public.personal_date_kind AS ENUM ('birthday','anniversary','holiday','vacation','countdown','other');

CREATE TABLE public.personal_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind public.personal_date_kind NOT NULL DEFAULT 'other',
  on_date date NOT NULL,
  is_recurring boolean NOT NULL DEFAULT true,
  notes text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_dates TO authenticated;
GRANT ALL ON public.personal_dates TO service_role;

ALTER TABLE public.personal_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own personal_dates" ON public.personal_dates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER personal_dates_set_updated_at
  BEFORE UPDATE ON public.personal_dates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX personal_dates_user_on_date_idx ON public.personal_dates (user_id, on_date);