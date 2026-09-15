CREATE POLICY restaurant_private_rider_read ON public.restaurant_private
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.restaurant_id = restaurant_private.restaurant_id
        AND o.partner_id = auth.uid()
        AND o.status NOT IN ('delivered', 'cancelled')
    )
  );
