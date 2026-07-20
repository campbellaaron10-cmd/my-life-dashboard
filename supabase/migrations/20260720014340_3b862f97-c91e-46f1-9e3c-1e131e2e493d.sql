
-- Nutrition source enum
DO $$ BEGIN
  CREATE TYPE public.nutrition_source AS ENUM ('usda', 'manual', 'barcode', 'imported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- foods ----------
CREATE TABLE public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  barcode text,
  source public.nutrition_source NOT NULL DEFAULT 'manual',
  external_id text,                            -- e.g. USDA FDC id
  serving_size numeric(10,3),                  -- amount per serving in `serving_unit`
  serving_unit text,                           -- e.g. 'g', 'ml', 'cup', 'piece'
  grams_per_serving numeric(10,3),             -- canonical serving weight in grams (for volume/count items)
  density_g_per_ml numeric(10,4),              -- optional, enables ml <-> g conversion
  calories numeric(10,2),                      -- per serving
  protein_g numeric(10,2),
  carbs_g numeric(10,2),
  fat_g numeric(10,2),
  fiber_g numeric(10,2),
  sugar_g numeric(10,2),
  sodium_mg numeric(10,2),
  notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX foods_user_name_idx ON public.foods (user_id, name);
CREATE INDEX foods_user_barcode_idx ON public.foods (user_id, barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX foods_user_external_idx ON public.foods (user_id, source, external_id) WHERE external_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foods TO authenticated;
GRANT ALL ON public.foods TO service_role;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own foods" ON public.foods
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER foods_updated BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- pantry_items: attach optional food reference ----------
ALTER TABLE public.pantry_items
  ADD COLUMN food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL;
CREATE INDEX pantry_items_food_idx ON public.pantry_items (food_id);

-- ---------- recipes ----------
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  servings numeric(6,2) NOT NULL DEFAULT 1,
  prep_minutes integer,
  cook_minutes integer,
  instructions text,
  source_url text,
  image_url text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recipes_user_title_idx ON public.recipes (user_id, title);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipes" ON public.recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER recipes_updated BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- recipe_ingredients ----------
CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  name_override text,                          -- free text when food_id is null
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit text,                                   -- e.g. 'g','ml','cup','tbsp','piece'
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients (recipe_id, sort_order);
CREATE INDEX recipe_ingredients_food_idx ON public.recipe_ingredients (food_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipe_ingredients" ON public.recipe_ingredients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER recipe_ingredients_updated BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
