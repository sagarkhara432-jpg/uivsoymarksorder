-- 1) app_settings: no anonymous access to payment credentials
DROP POLICY IF EXISTS settings_read_all ON public.app_settings;
CREATE POLICY settings_read_authenticated ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.app_settings_public AS
  SELECT id, app_name, logo_url, splash_url, download_url, delivery_radius_km,
         base_delivery_fee, free_delivery_over, tax_percent, service_enabled,
         service_message, primary_color, accent_color, splash_bg_color,
         checkout_theme_color, qr_logo_url,
         payment_online_enabled, payment_cod_enabled, payment_card_enabled
  FROM public.app_settings;
GRANT SELECT ON public.app_settings_public TO anon, authenticated;

-- 2) restaurants: hide phone / upi_id / commission from non-admins
DROP POLICY IF EXISTS rest_read_all ON public.restaurants;
CREATE POLICY rest_read_staff ON public.restaurants
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'kitchen') AND (owner_id IS NULL OR owner_id = auth.uid()))
  );

CREATE OR REPLACE VIEW public.restaurants_public AS
  SELECT id, name, description, address_line, landmark, city, pincode, lat, lng,
         logo_url, cover_url, is_open, is_sponsored, status, store_type, created_at
  FROM public.restaurants;
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- 3) admin_permissions: admins only
DROP POLICY IF EXISTS admin_permissions_read ON public.admin_permissions;
CREATE POLICY admin_permissions_admin_read ON public.admin_permissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) banner metrics: signed-in callers only
REVOKE EXECUTE ON FUNCTION public.bump_banner_metric(uuid, text) FROM anon;
