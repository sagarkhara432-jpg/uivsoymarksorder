-- 1) first-order discount: the single-use claim row must be writable by the signed-in user.
GRANT SELECT, INSERT ON public.first_order_flags TO authenticated;
GRANT ALL ON public.first_order_flags TO service_role;

-- 2) Kitchen updates: restrict the policy itself (defence in depth alongside the
--    enforce_order_update_rules trigger) so kitchen accounts can never change
--    pricing, identity, address or rider assignment on an order.
DROP POLICY IF EXISTS orders_kitchen_update ON public.orders;
CREATE POLICY orders_kitchen_update ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'kitchen'::app_role)
    AND status = ANY (ARRAY['placed','accepted','preparing','packed']::order_status[])
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'kitchen'::app_role)
    AND status = ANY (ARRAY['placed','accepted','preparing','packed','cancelled']::order_status[])
  );
