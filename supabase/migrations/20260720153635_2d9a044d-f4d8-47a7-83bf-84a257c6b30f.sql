
-- 1. Extend budget_categories
ALTER TABLE public.budget_categories
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'spending' CHECK (kind IN ('spending','savings','investment')),
  ADD COLUMN IF NOT EXISTS goal_amount numeric,
  ADD COLUMN IF NOT EXISTS rollover_balance numeric NOT NULL DEFAULT 0;

-- 2. Finance settings (per user)
CREATE TABLE IF NOT EXISTS public.finance_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fun_to_vacation_pct numeric NOT NULL DEFAULT 70,
  fun_to_sts_pct numeric NOT NULL DEFAULT 25,
  fun_to_fun_pct numeric NOT NULL DEFAULT 5,
  last_month_closed date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated;
GRANT ALL ON public.finance_settings TO service_role;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own finance_settings" ON public.finance_settings;
CREATE POLICY "own finance_settings" ON public.finance_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS finance_settings_updated_at ON public.finance_settings;
CREATE TRIGGER finance_settings_updated_at BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Balance snapshots for savings/investment growth graph
CREATE TABLE IF NOT EXISTS public.balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  label text,
  on_date date NOT NULL DEFAULT CURRENT_DATE,
  balance numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS balance_snapshots_user_date_idx ON public.balance_snapshots (user_id, on_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.balance_snapshots TO authenticated;
GRANT ALL ON public.balance_snapshots TO service_role;
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own balance_snapshots" ON public.balance_snapshots;
CREATE POLICY "own balance_snapshots" ON public.balance_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
