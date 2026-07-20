
-- 1. Foods: normalized nutrition + household measures ----------------------
ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS nutrient_basis text NOT NULL DEFAULT 'per_100g'
    CHECK (nutrient_basis IN ('per_100g', 'per_100ml')),
  ADD COLUMN IF NOT EXISTS n_calories numeric,
  ADD COLUMN IF NOT EXISTS n_protein_g numeric,
  ADD COLUMN IF NOT EXISTS n_carbs_g numeric,
  ADD COLUMN IF NOT EXISTS n_fat_g numeric,
  ADD COLUMN IF NOT EXISTS n_fiber_g numeric,
  ADD COLUMN IF NOT EXISTS n_sugar_g numeric,
  ADD COLUMN IF NOT EXISTS n_sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS household_measures jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS usda_data_type text;

-- 2. Tasks: shopping fields ------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.task_kind AS ENUM ('general', 'shopping');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS kind public.task_kind NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit text;

CREATE INDEX IF NOT EXISTS tasks_kind_idx ON public.tasks(user_id, kind, is_done);
CREATE INDEX IF NOT EXISTS tasks_food_idx ON public.tasks(food_id);

-- 3. Drop legacy grocery module -------------------------------------------
DROP TABLE IF EXISTS public.grocery_items CASCADE;
