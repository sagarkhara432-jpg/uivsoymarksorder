-- Trigger-only / internal SECURITY DEFINER (or trigger) functions must not be callable via the API
REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_user_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_pv_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_order_pickup_pin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_moderation_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_order_update_rules() FROM PUBLIC, anon, authenticated;

-- Read-only PIN oracle is redundant: consume_delivery_pin already verifies + marks used
DROP FUNCTION IF EXISTS public.verify_delivery_pin(uuid, text);

-- App-facing helpers stay callable only by signed-in users (never anon)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_delivery_pin(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_pickup_pin(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bump_banner_metric(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_delivery_pin(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_pickup_pin(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_banner_metric(uuid, text) TO anon, authenticated, service_role;