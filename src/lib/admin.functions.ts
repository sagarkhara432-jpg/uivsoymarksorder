import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DecideInput = z.object({
  verification_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional(),
});

export const decideVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecideInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: rErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("partner_verifications")
      .update({ status: data.decision, admin_notes: data.notes ?? null })
      .eq("id", data.verification_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
