ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS upi_id text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_upi_id_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_upi_id_format
  CHECK (upi_id IS NULL OR upi_id ~ '^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$');

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS store_type text NOT NULL DEFAULT 'fast_food';

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_upi_id_format;
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_upi_id_format
  CHECK (upi_id IS NULL OR upi_id ~ '^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$');

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_store_type_check;
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_store_type_check
  CHECK (store_type IN ('fast_food', 'vegis'));

ALTER TABLE public.partner_verifications
  ADD COLUMN IF NOT EXISTS upi_id text;

ALTER TABLE public.partner_verifications
  DROP CONSTRAINT IF EXISTS partner_verifications_upi_id_format;
ALTER TABLE public.partner_verifications
  ADD CONSTRAINT partner_verifications_upi_id_format
  CHECK (upi_id IS NULL OR upi_id ~ '^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$');

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cod_collect_method text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_cod_collect_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_cod_collect_method_check
  CHECK (cod_collect_method IS NULL OR cod_collect_method IN ('cash', 'upi_qr'));