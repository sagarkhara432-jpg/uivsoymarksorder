import { describe, expect, it } from "vitest";
import { hasDb, query, queryScalar } from "./db";
import { cover, printCoverageSummary } from "./rls-coverage";

/**
 * Regression tests for the two security findings:
 *  - orders_customer_writeall          (customers must not rewrite pricing/address/identity)
 *  - orders_kitchen_update_unrestricted (kitchen must not reassign riders or set delivery timestamps)
 *
 * The enforcement lives in Postgres (RLS policies + the enforce_order_update_rules
 * BEFORE UPDATE trigger), so these tests assert against the live schema definition.
 */

const d = hasDb ? describe : describe.skip;

function policies() {
  const rows = query(
    `select policyname, cmd, coalesce(qual,''), coalesce(with_check,'')
     from pg_policies where schemaname='public' and tablename='orders'`,
  );
  return new Map(rows.map((r) => [r[0], { cmd: r[1], qual: r[2], check: r[3] }]));
}

function triggerFunctionSource(): string {
  return queryScalar(
    `select pg_get_functiondef('public.enforce_order_update_rules()'::regprocedure)`,
  );
}

d("orders update trigger is installed", () => {
  it("has an enabled BEFORE UPDATE trigger on public.orders", () => {
    const rows = query(
      `select tgname, tgenabled, tgtype from pg_trigger
       where tgrelid='public.orders'::regclass and not tgisinternal
         and tgname='enforce_order_update_rules'`,
    );
    expect(rows.length).toBe(1);
    // 'O' = enabled in origin/local sessions (the default enabled state)
    expect(rows[0][1]).toBe("O");
    // bit 0 = ROW, bit 1 = BEFORE, bit 4 = UPDATE
    const tgtype = Number(rows[0][2]);
    expect(tgtype & 1).toBe(1);
    expect(tgtype & 2).toBe(2);
    expect(tgtype & 16).toBe(16);
  });

  it("is a plpgsql function with a pinned search_path", () => {
    const src = triggerFunctionSource();
    expect(src).toContain("LANGUAGE plpgsql");
    expect(src).toMatch(/SET search_path TO 'public'/);
  });
});

d("orders_customer_writeall regression", () => {
  it("locks pricing, address and identity columns for non-admins", () => {
    const src = triggerFunctionSource();
    for (const col of [
      "subtotal",
      "discount",
      "delivery_fee",
      "total",
      "first_order_discount",
      "address_line",
      "city",
      "pincode",
      "phone",
      "customer_id",
      "customer_name",
      "placed_at",
    ]) {
      expect(src, `column ${col} must be immutable`).toContain(
        `NEW.${col} IS DISTINCT FROM OLD.${col}`,
      );
    }
    expect(src).toMatch(/RAISE EXCEPTION 'Order pricing, address and identity fields cannot be modified'/);
    cover("guard:Order pricing, address and identity fields cannot be modified");
  });

  it("only lets a customer cancel an order that is still 'placed'", () => {
    const src = triggerFunctionSource();
    expect(src).toContain("auth.uid() = OLD.customer_id");
    expect(src).toMatch(/NEW\.status <> 'cancelled' OR OLD\.status <> 'placed'/);
    expect(src).toMatch(/RAISE EXCEPTION 'Customers may only cancel a placed order'/);
    cover("guard:Customers may only cancel a placed order");
  });

  it("blocks customers from touching workflow columns", () => {
    const src = triggerFunctionSource();
    expect(src).toMatch(
      /RAISE EXCEPTION 'Customers may only change order status to cancelled'/,
    );
    cover("guard:Customers may only change order status to cancelled");
  });

  it("keeps the customer cancel policy scoped in both USING and WITH CHECK", () => {
    const p = policies().get("orders_customer_cancel");
    expect(p).toBeDefined();
    expect(p!.cmd).toBe("UPDATE");
    expect(p!.qual).toContain("auth.uid() = customer_id");
    expect(p!.qual).toContain("'placed'::order_status");
    expect(p!.check).toContain("auth.uid() = customer_id");
    expect(p!.check).toContain("'cancelled'::order_status");
    cover("policy:orders_customer_cancel");
  });

  it("has no broad customer ALL/UPDATE policy on orders", () => {
    for (const [name, p] of policies()) {
      if (name === "orders_admin_all") continue;
      const wideOpen = p.cmd === "ALL" && !p.qual.includes("auth.uid()") && !p.qual.includes("has_role");
      expect(wideOpen, `policy ${name} is unrestricted`).toBe(false);
    }
    cover("policy:orders_admin_all");
  });

  it("falls through to a deny for anyone else", () => {
    expect(triggerFunctionSource()).toMatch(
      /RAISE EXCEPTION 'Not allowed to update this order'/,
    );
    cover("guard:Not allowed to update this order");
  });
});

d("orders_kitchen_update_unrestricted regression", () => {
  it("prevents kitchen staff from reassigning riders or delivery timestamps", () => {
    const src = triggerFunctionSource();
    expect(src).toContain("is_kitchen");
    expect(src).toMatch(
      /RAISE EXCEPTION 'Kitchen staff may not change delivery assignment or delivery timestamps'/,
    );
    for (const col of ["partner_id", "out_for_delivery_at", "delivered_at"]) {
      expect(src).toContain(`NEW.${col} IS DISTINCT FROM OLD.${col}`);
    }
    cover("guard:Kitchen staff may not change delivery assignment or delivery timestamps");
  });

  it("whitelists the only columns kitchen staff may change", () => {
    const src = triggerFunctionSource();
    expect(src).toContain("to_jsonb(NEW) - 'status' - 'prep_time_mins' - 'accepted_at' - 'packed_at' - 'updated_at'");
    expect(src).toMatch(
      /RAISE EXCEPTION 'Kitchen staff may only change order status and preparation fields'/,
    );
    cover("guard:Kitchen staff may only change order status and preparation fields");
  });


  it("restricts kitchen status transitions to the kitchen workflow", () => {
    const src = triggerFunctionSource();
    expect(src).toMatch(
      /NEW\.status NOT IN \('placed','accepted','preparing','packed','cancelled'\)/,
    );
    expect(src).toMatch(/RAISE EXCEPTION 'Invalid status transition for kitchen staff'/);

    const p = policies().get("orders_kitchen_update");
    expect(p).toBeDefined();
    expect(p!.check).toContain("has_role(auth.uid(), 'kitchen'::app_role)");
    for (const s of ["placed", "accepted", "preparing", "packed", "cancelled"]) {
      expect(p!.check).toContain(`'${s}'::order_status`);
    }
    // kitchen must never be allowed to jump to delivery states
    expect(p!.check).not.toContain("'out_for_delivery'::order_status");
    expect(p!.check).not.toContain("'delivered'::order_status");
    cover("policy:orders_kitchen_update", "guard:Invalid status transition for kitchen staff");
  });

  it("restricts delivery partners to their own orders and delivery statuses", () => {
    const src = triggerFunctionSource();
    expect(src).toContain("is_delivery AND OLD.partner_id = auth.uid()");
    expect(src).toMatch(
      /RAISE EXCEPTION 'Delivery partners may only update delivery status'/,
    );
    expect(src).toMatch(/NEW\.status NOT IN \('out_for_delivery','delivered'\)/);

    const p = policies().get("orders_delivery_update");
    expect(p).toBeDefined();
    expect(p!.qual).toContain("partner_id = auth.uid()");
    expect(p!.check).toContain("'out_for_delivery'::order_status");
    expect(p!.check).toContain("'delivered'::order_status");
    cover(
      "policy:orders_delivery_update",
      "guard:Delivery partners may only update delivery status",
      "guard:Invalid status transition for delivery partner",
    );
  });
});

d("orders table hardening", () => {
  it("has RLS enabled and forced-safe defaults", () => {
    const rows = query(
      `select relrowsecurity from pg_class where oid='public.orders'::regclass`,
    );
    expect(rows[0][0]).toBe("t");
  });

  it("does not grant order writes to anon", () => {
    const rows = query(
      `select privilege_type from information_schema.role_table_grants
       where table_schema='public' and table_name='orders' and grantee='anon'`,
    );
    const writes = rows.map((r) => r[0]).filter((p) => p !== "SELECT");
    expect(writes).toEqual([]);
  });
});

d("security-invariant coverage summary", () => {
  it("covers every live orders UPDATE policy and trigger guard", () => {
    const { pct, missed } = printCoverageSummary();
    expect(missed, `uncovered security rules: ${missed.join(", ")}`).toEqual([]);
    expect(pct).toBe(100);
  });
});
