CREATE TABLE public.landing_content (
  id text PRIMARY KEY DEFAULT 'global',
  badge_text text NOT NULL DEFAULT 'Get 50% off your first order',
  badge_bg text NOT NULL DEFAULT '#FDE68A',
  badge_fg text NOT NULL DEFAULT '#7C2D12',
  badge_enabled boolean NOT NULL DEFAULT true,
  headline text NOT NULL DEFAULT 'Hot food,',
  headline_highlight text NOT NULL DEFAULT 'delivered fast.',
  subheadline text NOT NULL DEFAULT 'Browse hand-picked menus, tap once, and watch your order fly across town in real time.',
  primary_label text NOT NULL DEFAULT 'Order food',
  primary_href text NOT NULL DEFAULT '/menu',
  primary_bg text NOT NULL DEFAULT '#DC2626',
  primary_fg text NOT NULL DEFAULT '#FFFFFF',
  secondary_label text NOT NULL DEFAULT 'Partner with us',
  secondary_href text NOT NULL DEFAULT '/partner',
  secondary_bg text NOT NULL DEFAULT '#FFFFFF',
  secondary_fg text NOT NULL DEFAULT '#111827',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.landing_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.landing_content TO authenticated;
GRANT ALL ON public.landing_content TO service_role;

ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_content_public_read" ON public.landing_content FOR SELECT USING (true);
CREATE POLICY "landing_content_admin_write" ON public.landing_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER landing_content_updated_at BEFORE UPDATE ON public.landing_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.landing_content (id, features) VALUES ('global', '[
  {"icon":"ChefHat","title":"Live kitchens","text":"Real-time order feed with prep-time tracking.","tone":"orange"},
  {"icon":"Bike","title":"Fastest riders","text":"Auto-assigned to your nearest verified partner.","tone":"fresh"},
  {"icon":"ShieldCheck","title":"Secure & private","text":"Masked calls, verified partners, protected data.","tone":"offer"}
]'::jsonb);

ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_content;