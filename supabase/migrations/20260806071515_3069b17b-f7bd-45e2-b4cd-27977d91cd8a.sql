CREATE TABLE IF NOT EXISTS public.menu_item_notes (
  menu_item_id uuid PRIMARY KEY REFERENCES public.menu_items(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.menu_item_notes (menu_item_id, notes)
SELECT id, admin_notes FROM public.menu_items WHERE admin_notes IS NOT NULL
ON CONFLICT (menu_item_id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_notes TO authenticated;
GRANT ALL ON public.menu_item_notes TO service_role;

ALTER TABLE public.menu_item_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_item_notes_admin_all" ON public.menu_item_notes;
CREATE POLICY "menu_item_notes_admin_all" ON public.menu_item_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_menu_item_notes_updated BEFORE UPDATE ON public.menu_item_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.menu_items DROP COLUMN IF EXISTS admin_notes;