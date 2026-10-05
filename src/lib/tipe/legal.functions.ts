import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEGAL } from "./legal";

// Registra o aceite com a versão vigente definida no servidor (o cliente não escolhe a versão).
export const recordLegalAcceptance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ documents: z.array(z.enum(["partner_terms", "privacy_policy"])).min(1).max(2) }).parse(d))
  .handler(async ({ data, context }) => {
    const rows = data.documents.map((doc) => ({ user_id: context.userId, document: doc, version: LEGAL[doc].version }));
    const { error } = await context.supabase.from("legal_acceptances").upsert(rows, { onConflict: "user_id,document,version", ignoreDuplicates: true });
    if (error) throw new Error("Não foi possível registrar o aceite");
    return { ok: true };
  });

export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    requestType: z.enum(["access", "correction", "deletion", "revoke_consent", "other"]),
    holderCategory: z.enum(["consumer", "restaurant", "staff", "other"]),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    details: z.string().trim().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { enforceRate, clientIp, logSecurityEvent } = await import("./security.server");
    await enforceRate(`privacy:${clientIp()}`, 3, 3600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("privacy_requests").insert({
      request_type: data.requestType, holder_category: data.holderCategory, name: data.name, email: data.email, details: data.details ?? null,
    });
    if (error) throw new Error("Não foi possível registrar a solicitação");
    await logSecurityEvent({ action: "privacy_request", resource: data.requestType });
    return { ok: true };
  });
