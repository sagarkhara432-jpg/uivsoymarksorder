
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('customer', 'kitchen', 'delivery', 'admin');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.order_status AS ENUM ('placed', 'accepted', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'cancelled');

-- =========================
-- updated_at helper
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_admin_read" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- New user hook: create profile, grant customer, promote master admin
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'sagarkharal21@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'sagarkharal21@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_user_confirmed();

-- =========================
-- PARTNER VERIFICATIONS
-- =========================
CREATE TABLE public.partner_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role public.app_role NOT NULL CHECK (requested_role IN ('kitchen','delivery')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_proof_path TEXT NOT NULL,
  vehicle_number TEXT,
  status public.verification_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, requested_role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_verifications TO authenticated;
GRANT ALL ON public.partner_verifications TO service_role;
ALTER TABLE public.partner_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_self_read" ON public.partner_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pv_self_insert" ON public.partner_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "pv_admin_all" ON public.partner_verifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_pv_updated BEFORE UPDATE ON public.partner_verifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- When admin approves, grant the role
CREATE OR REPLACE FUNCTION public.on_pv_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.user_id, NEW.requested_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_pv_approved AFTER UPDATE ON public.partner_verifications FOR EACH ROW EXECUTE FUNCTION public.on_pv_approved();

-- =========================
-- PARTNER STATUS (delivery)
-- =========================
CREATE TABLE public.partner_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_status TO authenticated;
GRANT ALL ON public.partner_status TO service_role;
ALTER TABLE public.partner_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_self" ON public.partner_status FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'delivery'));
CREATE POLICY "ps_kitchen_admin_read" ON public.partner_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'kitchen') OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.partner_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- CATEGORIES
-- =========================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_read_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "cat_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================
-- MENU ITEMS
-- =========================
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mi_read_all" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "mi_admin_write" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mi_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- ADDRESSES
-- =========================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  address_line TEXT NOT NULL,
  city TEXT,
  pincode TEXT,
  phone TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addr_self_all" ON public.addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- ORDERS
-- =========================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'placed',
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  prep_time_mins INT,
  first_order_discount BOOLEAN NOT NULL DEFAULT false,

  address_line TEXT NOT NULL,
  city TEXT,
  pincode TEXT,
  phone TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  customer_name TEXT,

  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_customer_read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "orders_customer_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_customer_cancel" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id AND status = 'placed')
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_kitchen_read" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'kitchen'));
CREATE POLICY "orders_kitchen_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'kitchen'))
  WITH CHECK (public.has_role(auth.uid(), 'kitchen'));
CREATE POLICY "orders_delivery_read" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'delivery') AND (partner_id = auth.uid() OR partner_id IS NULL));
CREATE POLICY "orders_delivery_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'delivery') AND partner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'delivery') AND partner_id = auth.uid());
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- ORDER ITEMS
-- =========================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  qty INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oi_via_order_read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.customer_id = auth.uid() OR
    public.has_role(auth.uid(),'kitchen') OR
    public.has_role(auth.uid(),'admin') OR
    (public.has_role(auth.uid(),'delivery') AND o.partner_id = auth.uid())
  )));
CREATE POLICY "oi_customer_insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE POLICY "oi_admin_all" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================
-- FIRST ORDER DISCOUNT LOCK
-- =========================
CREATE TABLE public.first_order_flags (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL
);
GRANT SELECT ON public.first_order_flags TO authenticated;
GRANT ALL ON public.first_order_flags TO service_role;
ALTER TABLE public.first_order_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fof_self_read" ON public.first_order_flags FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fof_admin_all" ON public.first_order_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================
-- REALTIME
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;

-- =========================
-- STORAGE POLICIES for id-proofs bucket
-- =========================
CREATE POLICY "idproof_self_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "idproof_self_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "idproof_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'id-proofs' AND public.has_role(auth.uid(),'admin'));

-- =========================
-- SEED DATA
-- =========================
INSERT INTO public.categories (id, name, emoji, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Recommended', '⭐', 1),
  ('11111111-1111-1111-1111-111111111102', 'Starters', '🥟', 2),
  ('11111111-1111-1111-1111-111111111103', 'Main Course', '🍛', 3),
  ('11111111-1111-1111-1111-111111111104', 'Pizza & Burgers', '🍕', 4),
  ('11111111-1111-1111-1111-111111111105', 'Desserts & Drinks', '🍰', 5);

INSERT INTO public.menu_items (category_id, name, description, price, image_url, is_veg, is_bestseller) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Butter Chicken', 'Creamy tomato gravy, tandoori chicken, garnished with cream', 320, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop', false, true),
  ('11111111-1111-1111-1111-111111111101', 'Paneer Tikka Masala', 'Cottage cheese cubes in rich spicy gravy', 280, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop', true, true),
  ('11111111-1111-1111-1111-111111111101', 'Chicken Biryani', 'Aromatic basmati rice with tender chicken, saffron', 260, 'https://images.unsplash.com/photo-1633945274309-2c16c96e97eb?w=800&auto=format&fit=crop', false, true),
  ('11111111-1111-1111-1111-111111111101', 'Veg Biryani', 'Long grain rice, mixed vegetables, whole spices', 220, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&auto=format&fit=crop', true, false),

  ('11111111-1111-1111-1111-111111111102', 'Paneer Tikka', 'Char-grilled marinated paneer with peppers', 240, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111102', 'Chicken 65', 'South-Indian spicy fried chicken', 260, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop', false, false),
  ('11111111-1111-1111-1111-111111111102', 'Veg Spring Rolls', 'Crispy rolls with mixed vegetables', 180, 'https://images.unsplash.com/photo-1548611635-b6e7827d7d8f?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111102', 'Chilli Paneer', 'Indo-Chinese paneer tossed in soy chilli sauce', 240, 'https://images.unsplash.com/photo-1626777553635-4ba0b8f7f0fd?w=800&auto=format&fit=crop', true, false),

  ('11111111-1111-1111-1111-111111111103', 'Dal Makhani', 'Slow-cooked black lentils, cream, butter', 220, 'https://images.unsplash.com/photo-1626777553635-be1f0ec8ac4c?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111103', 'Kadai Chicken', 'Chicken in kadai masala with bell peppers', 300, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop', false, false),
  ('11111111-1111-1111-1111-111111111103', 'Palak Paneer', 'Cottage cheese in fresh spinach gravy', 250, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111103', 'Butter Naan (2 pcs)', 'Soft tandoor bread brushed with butter', 60, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop', true, false),

  ('11111111-1111-1111-1111-111111111104', 'Margherita Pizza', 'Classic mozzarella and basil on thin crust', 250, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&auto=format&fit=crop', true, true),
  ('11111111-1111-1111-1111-111111111104', 'Farmhouse Pizza', 'Onion, capsicum, tomato, mushroom', 320, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111104', 'Chicken Tikka Pizza', 'Tandoori chicken tikka, onion, coriander', 380, 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=800&auto=format&fit=crop', false, true),
  ('11111111-1111-1111-1111-111111111104', 'Classic Cheeseburger', 'Beef patty, cheddar, lettuce, house sauce', 260, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop', false, false),

  ('11111111-1111-1111-1111-111111111105', 'Gulab Jamun (2 pcs)', 'Warm milk dumplings soaked in cardamom syrup', 90, 'https://images.unsplash.com/photo-1601303516361-71888ba25226?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111105', 'Choco Lava Cake', 'Molten chocolate centre, vanilla ice cream', 160, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop', true, true),
  ('11111111-1111-1111-1111-111111111105', 'Mango Lassi', 'Chilled yogurt smoothie with alphonso mango', 90, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop', true, false),
  ('11111111-1111-1111-1111-111111111105', 'Masala Chai', 'Spiced Indian tea, milk, cardamom, ginger', 40, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&auto=format&fit=crop', true, false);
