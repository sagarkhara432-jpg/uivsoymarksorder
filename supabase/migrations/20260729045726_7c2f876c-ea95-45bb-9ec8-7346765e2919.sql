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
    -- Kitchen may only move an order through the kitchen workflow.
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.out_for_delivery_at IS DISTINCT FROM OLD.out_for_delivery_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    THEN
      RAISE EXCEPTION 'Kitchen staff may not change delivery assignment or delivery timestamps';
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

DROP POLICY IF EXISTS orders_kitchen_update ON public.orders;
CREATE POLICY orders_kitchen_update ON public.orders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'kitchen'::app_role))
  WITH CHECK (
    has_role(auth.uid(), 'kitchen'::app_role)
    AND status = ANY (ARRAY['placed'::order_status,'accepted'::order_status,'preparing'::order_status,'packed'::order_status,'cancelled'::order_status])
  );