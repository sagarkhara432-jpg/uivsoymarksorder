
-- RESTAURANTS
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  phone text,
  address_line text,
  city text,
  pincode text,
  lat double precision,
  lng double precision,
  logo_url text,
  cover_url text,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY rest_read_all ON public.restaurants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rest_admin_write ON public.restaurants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_rest_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.restaurants (id, name, description, phone, address_line, city, pincode, lat, lng, is_open)
VALUES ('11111111-1111-4111-8111-111111111111', 'Uivsoymarks Kitchen', 'Hot food, delivered fast.', '+919000000000', 'Shop 4, Main Market Road', 'Pune', '411001', 18.5204, 73.8567, true);

-- MENU ITEMS extensions
ALTER TABLE public.menu_items
  ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ADD COLUMN out_of_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN admin_notes text;
UPDATE public.menu_items SET restaurant_id = '11111111-1111-4111-8111-111111111111';

-- APP SETTINGS (single row)
CREATE TABLE public.app_settings (
  id text PRIMARY KEY DEFAULT 'global',
  app_name text NOT NULL DEFAULT 'Uivsoymarks',
  logo_url text,
  splash_url text,
  download_url text,
  delivery_radius_km numeric NOT NULL DEFAULT 8,
  base_delivery_fee numeric NOT NULL DEFAULT 29,
  free_delivery_over numeric NOT NULL DEFAULT 400,
  tax_percent numeric NOT NULL DEFAULT 5,
  rider_payout_per_order numeric NOT NULL DEFAULT 35,
  service_enabled boolean NOT NULL DEFAULT true,
  service_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read_all ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY settings_admin_write ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.app_settings (id) VALUES ('global');

-- BANNERS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY banners_read_all ON public.banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY banners_admin_write ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS extensions
ALTER TABLE public.orders
  ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id),
  ADD COLUMN tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN rider_payout numeric NOT NULL DEFAULT 0,
  ADD COLUMN ready_at timestamptz,
  ADD COLUMN house_no text,
  ADD COLUMN building text,
  ADD COLUMN landmark text,
  ADD COLUMN address_tag text;
UPDATE public.orders SET restaurant_id = '11111111-1111-4111-8111-111111111111' WHERE restaurant_id IS NULL;

ALTER TABLE public.order_items
  ADD COLUMN image_url text,
  ADD COLUMN notes text;

-- ADDRESSES extensions
ALTER TABLE public.addresses
  ADD COLUMN house_no text,
  ADD COLUMN building text,
  ADD COLUMN landmark text;

-- DELIVERY PIN (customer-only visibility)
CREATE TABLE public.order_pins (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_pins TO authenticated;
GRANT ALL ON public.order_pins TO service_role;
ALTER TABLE public.order_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY pins_customer_read ON public.order_pins FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE OR REPLACE FUNCTION public.verify_delivery_pin(_order_id uuid, _pin text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_pins p WHERE p.order_id = _order_id AND p.pin = _pin);
$$;
REVOKE ALL ON FUNCTION public.verify_delivery_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_delivery_pin(uuid, text) TO authenticated, service_role;

-- ORDER CHAT
CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_messages_order_idx ON public.order_messages(order_id, created_at);
GRANT SELECT, INSERT ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY om_participants_read ON public.order_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND (o.customer_id = auth.uid() OR o.partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY om_participants_insert ON public.order_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND (o.customer_id = auth.uid() OR o.partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- RIDER EARNINGS
CREATE TABLE public.rider_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rider_earnings_partner_idx ON public.rider_earnings(partner_id, created_at DESC);
GRANT SELECT ON public.rider_earnings TO authenticated;
GRANT ALL ON public.rider_earnings TO service_role;
ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY re_self_read ON public.rider_earnings FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_self_read ON public.payout_requests FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pr_self_insert ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid() AND status = 'pending' AND public.has_role(auth.uid(),'delivery'));
CREATE POLICY pr_admin_update ON public.payout_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payout_updated BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RIDER DOCUMENTS
ALTER TABLE public.partner_verifications
  ADD COLUMN dl_path text,
  ADD COLUMN aadhaar_path text;

-- REALTIME
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
ALTER TABLE public.banners REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.restaurants REPLICA IDENTITY FULL;
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
