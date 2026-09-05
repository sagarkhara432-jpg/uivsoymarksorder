ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';

CREATE OR REPLACE FUNCTION public.protect_admin_role_grants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  v_role := COALESCE(NEW.role::text, OLD.role::text);
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_role = 'admin' THEN
    SELECT lower(email) INTO v_email FROM public.profiles WHERE id = auth.uid();
    IF v_email IS DISTINCT FROM 'sagarkharal21@gmail.com' THEN
      RAISE EXCEPTION 'Only the owner account can change full Admin access';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_admin_role_grants ON public.user_roles;
CREATE TRIGGER trg_protect_admin_role_grants
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role_grants();

REVOKE EXECUTE ON FUNCTION public.protect_admin_role_grants() FROM PUBLIC, anon, authenticated;