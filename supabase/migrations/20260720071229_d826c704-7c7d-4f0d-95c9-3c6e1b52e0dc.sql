ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS recipes_tags_idx ON public.recipes USING GIN (tags);