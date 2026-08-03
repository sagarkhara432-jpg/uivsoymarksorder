ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS kitchen_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS kitchen_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_kitchen_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.order_pickup_pins (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

GRANT SELECT ON public.order_pickup_pins TO authenticated;
GRANT ALL ON public.order_pickup_pins TO service_role;

ALTER TABLE public.order_pickup_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_pins_kitchen_read" ON public.order_pickup_pins;
CREATE POLICY "pickup_pins_kitchen_read"
ON public.order_pickup_pins FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'kitchen') OR public.has_role(auth.uid(), 'admin'));

-- Auto-generate the pickup code for every new order.
CREATE OR REPLACE FUNCTION public.create_order_pickup_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.order_pickup_pins (order_id, pin)
  VALUES (NEW.id, LPAD(floor(random() * 9000 + 1000)::text, 4, '0'))
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_order_pickup_pin ON public.orders;
CREATE TRIGGER trg_create_order_pickup_pin
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_order_pickup_pin();

-- Backfill codes for existing open orders.
INSERT INTO public.order_pickup_pins (order_id, pin)
SELECT o.id, LPAD(floor(random() * 9000 + 1000)::text, 4, '0')
FROM public.orders o
LEFT JOIN public.order_pickup_pins p ON p.order_id = o.id
WHERE p.order_id IS NULL;

-- Rider-side pickup verification. Only the assigned rider may consume the code;
-- the code itself never leaves the database.
CREATE OR REPLACE FUNCTION public.consume_pickup_pin(_order_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.order_pickup_pins p
    JOIN public.orders o ON o.id = p.order_id
    WHERE p.order_id = _order_id
      AND p.pin = _pin
      AND o.partner_id IS NOT NULL
      AND o.partner_id = auth.uid()
  ) INTO ok;

  IF ok THEN
    UPDATE public.order_pickup_pins SET verified_at = now() WHERE order_id = _order_id;
  END IF;
  RETURN ok;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pickup_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_pickup_pin(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_order_pickup_pin() FROM PUBLIC, anon;

-- Orders must not become 'out_for_delivery' until the kitchen code is verified.
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
       OR NEW.is_kitchen_verified IS DISTINCT FROM OLD.is_kitchen_verified
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
    -- pickup is only reachable once the kitchen handover code has been verified
    IF NEW.status = 'out_for_delivery' AND OLD.status IS DISTINCT FROM 'out_for_delivery' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.order_pickup_pins p
        WHERE p.order_id = NEW.id AND p.verified_at IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'Pickup must be confirmed with the kitchen handover code';
      END IF;
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
       OR NEW.is_kitchen_verified IS DISTINCT FROM OLD.is_kitchen_verified
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;