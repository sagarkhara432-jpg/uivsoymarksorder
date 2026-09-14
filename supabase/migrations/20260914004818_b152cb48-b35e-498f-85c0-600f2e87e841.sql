CREATE OR REPLACE FUNCTION public.protect_admin_role_grants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_role text;
  v_target uuid;
  v_target_email text;
BEGIN
  v_role := COALESCE(NEW.role::text, OLD.role::text);
  v_target := COALESCE(NEW.user_id, OLD.user_id);

  -- Owner's own admin row is immutable: no delete, no role change, no downgrade.
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT lower(p.email) INTO v_target_email FROM public.profiles p WHERE p.id = OLD.user_id;
    IF v_target_email = 'sagarkharal21@gmail.com' AND OLD.role::text = 'admin' THEN
      IF TG_OP = 'DELETE'
         OR NEW.role::text IS DISTINCT FROM 'admin'
         OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'The owner account''s Admin access cannot be removed or changed.';
      END IF;
    END IF;
  END IF;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.protect_admin_role_grants() FROM PUBLIC, anon, authenticated;