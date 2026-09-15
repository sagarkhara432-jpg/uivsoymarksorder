-- clean up the views from the previous attempt
DROP VIEW IF EXISTS public.app_settings_public;
DROP VIEW IF EXISTS public.restaurants_public;

-- ---------- payment settings (sensitive) ----------
CREATE TABLE public.payment_settings (
  id text PRIMARY KEY,
  upi_id text,
  upi_holder_name text,
  upi_merchant_name text,
  upi_qr_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_settings_read ON public.payment_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY payment_settings_admin_write ON public.payment_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_payment_settings_updated BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_settings (id, upi_id, upi_holder_name, upi_merchant_name, upi_qr_url)
SELECT 'global', upi_id, upi_holder_name, upi_merchant_name, upi_qr_url
FROM public.app_settings WHERE id = 'global'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payment_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings
  DROP COLUMN upi_id,
  DROP COLUMN upi_holder_name,
  DROP COLUMN upi_merchant_name,
  DROP COLUMN upi_qr_url;

-- app_settings stays publicly readable (branding only now)
DROP POLICY IF EXISTS settings_read_authenticated ON public.app_settings;
CREATE POLICY settings_read_all ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- kitchen private details ----------
CREATE TABLE public.restaurant_private (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone text,
  upi_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_private TO authenticated;
GRANT ALL ON public.restaurant_private TO service_role;
ALTER TABLE public.restaurant_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY restaurant_private_staff_all ON public.restaurant_private
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'kitchen') AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_private.restaurant_id
        AND (r.owner_id IS NULL OR r.owner_id = auth.uid())
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'kitchen') AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_private.restaurant_id
        AND (r.owner_id IS NULL OR r.owner_id = auth.uid())
    ))
  );
CREATE TRIGGER trg_restaurant_private_updated BEFORE UPDATE ON public.restaurant_private
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.restaurant_private (restaurant_id, phone, upi_id)
SELECT id, phone, upi_id FROM public.restaurants
ON CONFLICT (restaurant_id) DO NOTHING;

ALTER TABLE public.restaurants
  DROP COLUMN phone,
  DROP COLUMN upi_id;

-- restaurants stay publicly readable (no phone / payment data anymore)
DROP POLICY IF EXISTS rest_read_staff ON public.restaurants;
CREATE POLICY rest_read_all ON public.restaurants
  FOR SELECT TO anon, authenticated USING (true);
