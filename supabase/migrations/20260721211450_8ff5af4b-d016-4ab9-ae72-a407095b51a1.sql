ALTER TABLE public.monthly_summaries
  ADD COLUMN IF NOT EXISTS rsu_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsu_contribution numeric NOT NULL DEFAULT 0;