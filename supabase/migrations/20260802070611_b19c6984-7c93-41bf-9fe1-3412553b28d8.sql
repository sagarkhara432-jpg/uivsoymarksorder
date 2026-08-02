-- 1) Remove all anon privileges on sensitive order tables (no anon policies exist, so no behavior change)
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.first_order_flags FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT ON public.first_order_flags TO authenticated;
GRANT ALL ON public.first_order_flags TO service_role;

-- 2) One-claim-only guarantee for the first-order discount
CREATE UNIQUE INDEX IF NOT EXISTS first_order_flags_user_id_key ON public.first_order_flags (user_id);

-- 3) Delivery partners: assigned orders only
DROP POLICY IF EXISTS orders_delivery_read ON public.orders;
CREATE POLICY orders_delivery_read ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'delivery') AND partner_id = auth.uid());

-- 4) Kitchen: preparation-stage status changes only (column whitelist enforced by trigger)
DROP POLICY IF EXISTS orders_kitchen_update ON public.orders;
CREATE POLICY orders_kitchen_update ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'kitchen')
    AND status IN ('placed','accepted','preparing','packed')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'kitchen')
    AND status IN ('placed','accepted','preparing','packed','cancelled')
  );
