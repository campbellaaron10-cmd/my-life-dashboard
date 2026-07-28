
-- ============================================================
-- Trips module: Places, Bucket List, structured Trip children
-- ============================================================

-- Enum for bucket-list lifecycle (separate from trip status)
DO $$ BEGIN
  CREATE TYPE public.bucket_status AS ENUM ('idea','planned','in_progress','done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- places ----------
CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  google_place_id text,
  lat numeric,
  lng numeric,
  address text,
  maps_url text,
  notes text,
  rating integer,
  status text NOT NULL DEFAULT 'want_to_visit',
  estimated_cost numeric,
  travel_time_minutes integer,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX places_user_idx ON public.places(user_id);
CREATE UNIQUE INDEX places_user_gpid_uidx ON public.places(user_id, google_place_id) WHERE google_place_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own places" ON public.places FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER places_updated_at BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- bucket_list_items ----------
CREATE TABLE public.bucket_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  cover_url text,
  estimated_cost numeric,
  vacation_days_needed integer,
  ideal_season text,
  requirements text,
  progress_pct integer NOT NULL DEFAULT 0,
  status public.bucket_status NOT NULL DEFAULT 'idea',
  related_trip_id uuid,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bucket_user_idx ON public.bucket_list_items(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_list_items TO authenticated;
GRANT ALL ON public.bucket_list_items TO service_role;
ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bucket" ON public.bucket_list_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bucket_updated_at BEFORE UPDATE ON public.bucket_list_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- bucket_item_places (join) ----------
CREATE TABLE public.bucket_item_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bucket_item_id uuid NOT NULL REFERENCES public.bucket_list_items(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_item_id, place_id)
);
CREATE INDEX bip_user_idx ON public.bucket_item_places(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_item_places TO authenticated;
GRANT ALL ON public.bucket_item_places TO service_role;
ALTER TABLE public.bucket_item_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bucket_places" ON public.bucket_item_places FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- trip_places (join) ----------
CREATE TABLE public.trip_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  visited boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, place_id)
);
CREATE INDEX tp_user_idx ON public.trip_places(user_id);
CREATE INDEX tp_trip_idx ON public.trip_places(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_places TO authenticated;
GRANT ALL ON public.trip_places TO service_role;
ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trip_places" ON public.trip_places FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trip_places_updated_at BEFORE UPDATE ON public.trip_places
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- trip_flights ----------
CREATE TABLE public.trip_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  airline text,
  flight_number text,
  confirmation_code text,
  depart_airport text,
  arrive_airport text,
  depart_at timestamptz,
  arrive_at timestamptz,
  seat text,
  cost numeric,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX flights_trip_idx ON public.trip_flights(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_flights TO authenticated;
GRANT ALL ON public.trip_flights TO service_role;
ALTER TABLE public.trip_flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flights" ON public.trip_flights FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trip_flights_updated_at BEFORE UPDATE ON public.trip_flights
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- trip_packing_items ----------
CREATE TABLE public.trip_packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 1,
  packed boolean NOT NULL DEFAULT false,
  needs_action boolean NOT NULL DEFAULT false,
  task_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pack_trip_idx ON public.trip_packing_items(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_packing_items TO authenticated;
GRANT ALL ON public.trip_packing_items TO service_role;
ALTER TABLE public.trip_packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own packing" ON public.trip_packing_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER packing_updated_at BEFORE UPDATE ON public.trip_packing_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- trip_photos ----------
CREATE TABLE public.trip_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  url text NOT NULL,
  caption text,
  taken_on date,
  source text NOT NULL DEFAULT 'url',        -- 'url' | 'google_photos' | 'upload'
  external_id text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_trip_idx ON public.trip_photos(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_photos TO authenticated;
GRANT ALL ON public.trip_photos TO service_role;
ALTER TABLE public.trip_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.trip_photos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER photos_updated_at BEFORE UPDATE ON public.trip_photos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- trip_travelers ----------
CREATE TABLE public.trip_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX travelers_trip_idx ON public.trip_travelers(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_travelers TO authenticated;
GRANT ALL ON public.trip_travelers TO service_role;
ALTER TABLE public.trip_travelers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own travelers" ON public.trip_travelers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER travelers_updated_at BEFORE UPDATE ON public.trip_travelers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- trip_budget_allocations ----------
CREATE TABLE public.trip_budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  allocated numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, category)
);
CREATE INDEX alloc_trip_idx ON public.trip_budget_allocations(trip_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_budget_allocations TO authenticated;
GRANT ALL ON public.trip_budget_allocations TO service_role;
ALTER TABLE public.trip_budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alloc" ON public.trip_budget_allocations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER alloc_updated_at BEFORE UPDATE ON public.trip_budget_allocations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Alter trips
-- ============================================================
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS destination_place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_text text,
  ADD COLUMN IF NOT EXISTS cover_place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS home_lat numeric,
  ADD COLUMN IF NOT EXISTS home_lng numeric,
  ADD COLUMN IF NOT EXISTS trip_type text NOT NULL DEFAULT 'leisure',
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS would_visit_again boolean,
  ADD COLUMN IF NOT EXISTS final_expenses numeric,
  ADD COLUMN IF NOT EXISTS lessons_learned text;

-- Backfill destination_text from existing free-text destination if column exists
UPDATE public.trips SET destination_text = destination WHERE destination_text IS NULL AND destination IS NOT NULL;

-- ============================================================
-- Alter trip_items for full itinerary support
-- ============================================================
ALTER TABLE public.trip_items
  ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric,
  ADD COLUMN IF NOT EXISTS reservation_url text,
  ADD COLUMN IF NOT EXISTS confirmation_code text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_at timestamptz;
