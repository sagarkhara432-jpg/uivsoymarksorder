CREATE TABLE public.nav_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.nav_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  icon text NOT NULL DEFAULT 'Folder',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX nav_modules_parent_slug_key ON public.nav_modules (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(slug));
CREATE INDEX nav_modules_parent_idx ON public.nav_modules (parent_id);

GRANT SELECT ON public.nav_modules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nav_modules TO authenticated;
GRANT ALL ON public.nav_modules TO service_role;

ALTER TABLE public.nav_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nav_modules_read" ON public.nav_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "nav_modules_admin_insert" ON public.nav_modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nav_modules_admin_update" ON public.nav_modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nav_modules_admin_delete" ON public.nav_modules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_nav_modules_updated BEFORE UPDATE ON public.nav_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_nav_modules AFTER INSERT OR UPDATE OR DELETE ON public.nav_modules FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role)
);

GRANT SELECT ON public.admin_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_permissions_read" ON public.admin_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_permissions_admin_write" ON public.admin_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_permissions_updated BEFORE UPDATE ON public.admin_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.admin_permissions (role, can_view, can_create, can_edit, can_delete) VALUES
  ('super_admin', true, true, true, true),
  ('manager', true, true, true, false),
  ('editor', true, false, true, false);

WITH l1 AS (
  INSERT INTO public.nav_modules (title, slug, icon, description, sort_order) VALUES
    ('E-commerce', 'ecommerce', 'ShoppingBag', 'Catalog, categories and product screens', 1),
    ('Operations', 'operations', 'Truck', 'Kitchens, riders and dispatch controls', 2),
    ('People', 'people', 'Users', 'Admins, roles and customer records', 3)
  RETURNING id, slug
), l2 AS (
  INSERT INTO public.nav_modules (parent_id, title, slug, icon, description, sort_order)
  SELECT id, v.title, v.slug, v.icon, v.description, v.sort_order
  FROM l1 JOIN (VALUES
    ('ecommerce', 'Consumer Electronics', 'consumer-electronics', 'Cpu', 'Electronics catalog tree', 1),
    ('ecommerce', 'Grocery', 'grocery', 'Apple', 'Daily essentials catalog', 2),
    ('operations', 'Kitchens', 'kitchens', 'Store', 'Kitchen partners and status', 1),
    ('operations', 'Delivery Fleet', 'delivery-fleet', 'Bike', 'Rider fleet management', 2),
    ('people', 'Administrators', 'administrators', 'ShieldCheck', 'Admin users and permissions', 1)
  ) AS v(parent_slug, title, slug, icon, description, sort_order) ON v.parent_slug = l1.slug
  RETURNING id, slug
)
INSERT INTO public.nav_modules (parent_id, title, slug, icon, description, sort_order)
SELECT id, v.title, v.slug, v.icon, v.description, v.sort_order
FROM l2 JOIN (VALUES
  ('consumer-electronics', 'Smartwatches', 'smartwatches', 'Watch', 'Wearables product table', 1),
  ('consumer-electronics', 'Mobiles', 'mobiles', 'Smartphone', 'Mobile phones product table', 2),
  ('consumer-electronics', 'Audio', 'audio', 'Headphones', 'Headphones and speakers', 3),
  ('grocery', 'Beverages', 'beverages', 'CupSoda', 'Drinks and juices', 1),
  ('kitchens', 'Active Kitchens', 'active-kitchens', 'CircleCheck', 'Currently serving kitchens', 1),
  ('kitchens', 'Suspended Kitchens', 'suspended-kitchens', 'CircleSlash', 'Paused kitchen partners', 2),
  ('delivery-fleet', 'Online Riders', 'online-riders', 'Radio', 'Riders currently online', 1),
  ('administrators', 'Role Matrix', 'role-matrix', 'KeyRound', 'Role and permission matrix', 1)
) AS v(parent_slug, title, slug, icon, description, sort_order) ON v.parent_slug = l2.slug;