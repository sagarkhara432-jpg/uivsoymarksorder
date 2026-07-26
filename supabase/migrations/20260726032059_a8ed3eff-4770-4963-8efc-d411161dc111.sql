CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_table_idx ON public.audit_logs (table_name);

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_record text;
BEGIN
  SELECT p.email INTO v_email FROM public.profiles p WHERE p.id = v_actor;

  IF TG_OP = 'DELETE' THEN
    v_record := COALESCE((to_jsonb(OLD)->>'id'), '');
    INSERT INTO public.audit_logs (actor_id, actor_email, table_name, record_id, action, old_data, new_data)
    VALUES (v_actor, v_email, TG_TABLE_NAME, v_record, 'delete', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record := COALESCE((to_jsonb(NEW)->>'id'), '');
    IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
      INSERT INTO public.audit_logs (actor_id, actor_email, table_name, record_id, action, old_data, new_data)
      VALUES (v_actor, v_email, TG_TABLE_NAME, v_record, 'update', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSE
    v_record := COALESCE((to_jsonb(NEW)->>'id'), '');
    INSERT INTO public.audit_logs (actor_id, actor_email, table_name, record_id, action, old_data, new_data)
    VALUES (v_actor, v_email, TG_TABLE_NAME, v_record, 'insert', NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_coupons ON public.coupons;
CREATE TRIGGER audit_coupons AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_menu_items ON public.menu_items;
CREATE TRIGGER audit_menu_items AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_categories ON public.categories;
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;