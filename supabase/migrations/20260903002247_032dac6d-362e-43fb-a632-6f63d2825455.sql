CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  label text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'global',
  category text,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX feature_flags_unique_target ON public.feature_flags (
  feature_key,
  scope,
  COALESCE(category, ''),
  COALESCE(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_read" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_flags_admin_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_feature_flags_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_feature_flags AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TABLE public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_admin_read" ON public.impersonation_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "impersonation_admin_insert" ON public.impersonation_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());
CREATE POLICY "impersonation_admin_update" ON public.impersonation_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

INSERT INTO public.feature_flags (feature_key, label, description, scope) VALUES
  ('ordering', 'Order intake', 'Accept new customer orders', 'global'),
  ('delivery', 'Home delivery', 'Doorstep delivery by riders', 'global'),
  ('cod', 'Cash on delivery', 'Allow paying cash at the door', 'global'),
  ('online_payment', 'Online payment', 'UPI and card payments', 'global'),
  ('coupons', 'Coupons & offers', 'Promo code redemption', 'global'),
  ('scheduling', 'Scheduled orders', 'Order ahead for a later slot', 'global'),
  ('inventory_csv', 'Inventory CSV upload', 'Bulk price and stock upload', 'global'),
  ('live_tracking', 'Live order tracking', 'Realtime rider map for customers', 'global');

INSERT INTO public.feature_flags (feature_key, label, description, scope, category)
SELECT f.feature_key, f.label, f.description, 'category', c.category
FROM (VALUES
  ('ordering', 'Order intake', 'Accept new customer orders'),
  ('delivery', 'Home delivery', 'Doorstep delivery by riders'),
  ('cod', 'Cash on delivery', 'Allow paying cash at the door'),
  ('inventory_csv', 'Inventory CSV upload', 'Bulk price and stock upload')
) AS f(feature_key, label, description)
CROSS JOIN (VALUES ('kirana'), ('fruits_vegetables'), ('food')) AS c(category);