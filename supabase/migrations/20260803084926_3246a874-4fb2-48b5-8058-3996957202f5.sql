-- 1) Blocked users cannot unblock themselves
CREATE OR REPLACE FUNCTION public.protect_profile_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    NEW.is_blocked := OLD.is_blocked;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_moderation_fields ON public.profiles;
CREATE TRIGGER protect_profile_moderation_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_moderation_fields();

-- 2) Delivery PIN oracle: only the assigned partner (or admin) may verify
CREATE OR REPLACE FUNCTION public.verify_delivery_pin(_order_id uuid, _pin text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_pins p
    JOIN public.orders o ON o.id = p.order_id
    WHERE p.order_id = _order_id
      AND p.pin = _pin
      AND (
        (o.partner_id IS NOT NULL AND o.partner_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.verify_delivery_pin(uuid, text) FROM anon;

-- 3) Anon must not execute SECURITY DEFINER metric bumping
REVOKE ALL ON FUNCTION public.bump_banner_metric(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.bump_banner_metric(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_banner_metric(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_user_confirmed() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.on_pv_approved() FROM anon, PUBLIC;

-- 4) Kitchen may only touch the preparation workflow columns (incl. ready_at)
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin');
  is_kitchen boolean := public.has_role(auth.uid(), 'kitchen');
  is_delivery boolean := public.has_role(auth.uid(), 'delivery');
BEGIN
  IF auth.uid() IS NULL OR is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.discount IS DISTINCT FROM OLD.discount
     OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.tax IS DISTINCT FROM OLD.tax
     OR NEW.rider_payout IS DISTINCT FROM OLD.rider_payout
     OR NEW.commission_percent IS DISTINCT FROM OLD.commission_percent
     OR NEW.kitchen_payout IS DISTINCT FROM OLD.kitchen_payout
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.first_order_discount IS DISTINCT FROM OLD.first_order_discount
     OR NEW.address_line IS DISTINCT FROM OLD.address_line
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.pincode IS DISTINCT FROM OLD.pincode
     OR NEW.lat IS DISTINCT FROM OLD.lat
     OR NEW.lng IS DISTINCT FROM OLD.lng
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
     OR NEW.placed_at IS DISTINCT FROM OLD.placed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Order pricing, address and identity fields cannot be modified';
  END IF;

  IF is_kitchen THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.out_for_delivery_at IS DISTINCT FROM OLD.out_for_delivery_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    THEN
      RAISE EXCEPTION 'Kitchen staff may not change delivery assignment or delivery timestamps';
    END IF;
    IF (to_jsonb(NEW) - 'status' - 'prep_time_mins' - 'accepted_at' - 'packed_at' - 'ready_at' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'prep_time_mins' - 'accepted_at' - 'packed_at' - 'ready_at' - 'updated_at')
    THEN
      RAISE EXCEPTION 'Kitchen staff may only change order status and preparation fields';
    END IF;
    IF NEW.status NOT IN ('placed','accepted','preparing','packed','cancelled') THEN
      RAISE EXCEPTION 'Invalid status transition for kitchen staff';
    END IF;
    RETURN NEW;
  END IF;

  IF is_delivery AND OLD.partner_id = auth.uid() THEN
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.prep_time_mins IS DISTINCT FROM OLD.prep_time_mins
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.packed_at IS DISTINCT FROM OLD.packed_at
    THEN
      RAISE EXCEPTION 'Delivery partners may only update delivery status';
    END IF;
    IF NEW.status NOT IN ('out_for_delivery','delivered') THEN
      RAISE EXCEPTION 'Invalid status transition for delivery partner';
    END IF;
    -- 'delivered' is only reachable once the customer PIN has been verified
    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.order_pins p WHERE p.order_id = NEW.id AND p.verified_at IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'Delivery must be completed with the customer delivery code';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.customer_id THEN
    IF NEW.status <> 'cancelled' OR OLD.status <> 'placed' THEN
      RAISE EXCEPTION 'Customers may only cancel a placed order';
    END IF;
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.prep_time_mins IS DISTINCT FROM OLD.prep_time_mins
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.packed_at IS DISTINCT FROM OLD.packed_at
       OR NEW.out_for_delivery_at IS DISTINCT FROM OLD.out_for_delivery_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    THEN
      RAISE EXCEPTION 'Customers may only change order status to cancelled';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this order';
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_update_rules ON public.orders;
CREATE TRIGGER enforce_order_update_rules
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_update_rules();

-- PIN verification audit column used by the delivery guard above
ALTER TABLE public.order_pins ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Marks the PIN verified; callable only by the assigned rider with the right PIN
CREATE OR REPLACE FUNCTION public.consume_delivery_pin(_order_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.order_pins p
    JOIN public.orders o ON o.id = p.order_id
    WHERE p.order_id = _order_id AND p.pin = _pin
      AND o.partner_id IS NOT NULL AND o.partner_id = auth.uid()
  ) INTO ok;
  IF ok THEN
    UPDATE public.order_pins SET verified_at = now() WHERE order_id = _order_id;
  END IF;
  RETURN ok;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_delivery_pin(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_delivery_pin(uuid, text) TO authenticated;

-- 5) Delivery accounts only ever see their own assigned orders
DROP POLICY IF EXISTS orders_delivery_read ON public.orders;
CREATE POLICY orders_delivery_read ON public.orders
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'delivery') AND partner_id = auth.uid());

-- 6) First-order offer: single-use reservation with explicit access
ALTER TABLE public.first_order_flags ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.first_order_flags TO authenticated;
GRANT ALL ON public.first_order_flags TO service_role;
REVOKE ALL ON public.first_order_flags FROM anon;
REVOKE ALL ON public.order_pins FROM anon;
REVOKE UPDATE, DELETE ON public.first_order_flags FROM authenticated;