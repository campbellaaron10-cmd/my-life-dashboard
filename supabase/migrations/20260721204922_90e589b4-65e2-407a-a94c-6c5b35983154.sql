
-- 1. Expand txn_type enum
ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'savings_contribution';
ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'investment_contribution';
ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'adjustment';

-- 2. Make account optional on transactions
ALTER TABLE public.transactions ALTER COLUMN account_id DROP NOT NULL;

-- 3. Rules JSON on finance_settings
ALTER TABLE public.finance_settings
  ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Monthly summaries table
CREATE TABLE IF NOT EXISTS public.monthly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  income NUMERIC(14,2) NOT NULL DEFAULT 0,
  housing NUMERIC(14,2) NOT NULL DEFAULT 0,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  ess_allocated NUMERIC(14,2) NOT NULL DEFAULT 0,
  ess_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  fun_allocated NUMERIC(14,2) NOT NULL DEFAULT 0,
  fun_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  sts_allocated NUMERIC(14,2) NOT NULL DEFAULT 0,
  sts_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  vac_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  sts_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  lts_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
  lts_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  fed_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  fed_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  regions_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_summaries TO authenticated;
GRANT ALL ON public.monthly_summaries TO service_role;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own monthly_summaries" ON public.monthly_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER monthly_summaries_updated BEFORE UPDATE ON public.monthly_summaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS monthly_summaries_user_month_idx
  ON public.monthly_summaries (user_id, month DESC);

-- 5. Raw imports (keep the uploaded workbook reference)
CREATE TABLE IF NOT EXISTS public.raw_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT,
  kind TEXT NOT NULL DEFAULT 'budget_workbook',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_imports TO authenticated;
GRANT ALL ON public.raw_imports TO service_role;
ALTER TABLE public.raw_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own raw_imports" ON public.raw_imports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
