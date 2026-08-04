ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS commission_percent numeric,
  ADD COLUMN IF NOT EXISTS landmark text,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

CREATE POLICY "rest_kitchen_update" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'kitchen') AND (owner_id IS NULL OR owner_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'kitchen') AND (owner_id IS NULL OR owner_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;

CREATE POLICY "ps_admin_all" ON public.partner_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));