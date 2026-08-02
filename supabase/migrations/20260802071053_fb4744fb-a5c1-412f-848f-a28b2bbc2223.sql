ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#e23744',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#f5a623',
  ADD COLUMN IF NOT EXISTS splash_bg_color text NOT NULL DEFAULT '#e23744',
  ADD COLUMN IF NOT EXISTS checkout_theme_color text NOT NULL DEFAULT '#1f9d55',
  ADD COLUMN IF NOT EXISTS qr_logo_url text,
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS upi_holder_name text,
  ADD COLUMN IF NOT EXISTS upi_merchant_name text,
  ADD COLUMN IF NOT EXISTS upi_qr_url text,
  ADD COLUMN IF NOT EXISTS payment_online_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_cod_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_card_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS per_km_rate numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS rider_incentive_amount numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS rider_incentive_km numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 15;

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL;

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kitchen_payout numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_banner_metric(_banner_id uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _kind = 'click' THEN
    UPDATE public.banners SET clicks = clicks + 1 WHERE id = _banner_id;
  ELSE
    UPDATE public.banners SET impressions = impressions + 1 WHERE id = _banner_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_banner_metric(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_banner_metric(uuid, text) TO anon, authenticated;