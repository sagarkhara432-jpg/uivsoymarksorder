-- Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','flat')),
  value NUMERIC NOT NULL CHECK (value >= 0),
  min_order NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed-in can read active coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Block users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- Prevent blocked users from placing orders (RLS insert restriction on orders)
DROP POLICY IF EXISTS "Customers place their own orders" ON public.orders;
CREATE POLICY "Customers place their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_blocked = true)
  );

-- Admin can update any profile (for blocking)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR id = auth.uid());