-- 1) delivery_unassigned_orders: restrict delivery reads to assigned orders only
DROP POLICY IF EXISTS orders_delivery_read ON public.orders;
CREATE POLICY orders_delivery_read ON public.orders
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'delivery'::app_role) AND partner_id = auth.uid());

-- 2) first_order_discount_bypass: allow users to record their own first-order flag exactly once
GRANT SELECT, INSERT ON public.first_order_flags TO authenticated;
GRANT ALL ON public.first_order_flags TO service_role;

DROP POLICY IF EXISTS fof_self_insert ON public.first_order_flags;
CREATE POLICY fof_self_insert ON public.first_order_flags
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ensure one flag per user (idempotent guard against repeat discounts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.first_order_flags'::regclass AND contype IN ('p','u')
  ) THEN
    ALTER TABLE public.first_order_flags ADD CONSTRAINT first_order_flags_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3) orders_kitchen_update_unrestricted: whitelist the columns kitchen staff may change
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin');
  is_kitchen boolean := public.has_role(auth.uid(), 'kitchen');
  is_delivery boolean := public.has_role(auth.uid(), 'delivery');
BEGIN
  IF auth.uid() IS NULL OR is_admin THEN
    RETURN NEW;
  END IF;

  -- Immutable for everyone except admins
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.discount IS DISTINCT FROM OLD.discount
     OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
     OR NEW.total IS DISTINCT FROM OLD.total
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
    -- Kitchen may only touch status, prep_time_mins, accepted_at, packed_at, updated_at.
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.out_for_delivery_at IS DISTINCT FROM OLD.out_for_delivery_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    THEN
      RAISE EXCEPTION 'Kitchen staff may not change delivery assignment or delivery timestamps';
    END IF;
    -- Column whitelist: reject any change outside the kitchen workflow columns.
    IF (to_jsonb(NEW) - 'status' - 'prep_time_mins' - 'accepted_at' - 'packed_at' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'prep_time_mins' - 'accepted_at' - 'packed_at' - 'updated_at')
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
$function$;