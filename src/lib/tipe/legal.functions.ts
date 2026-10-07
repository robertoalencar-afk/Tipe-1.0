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

const REQUEST_LABEL = {
  access: "Acessar meus dados", correction: "Corrigir dados", anonymization: "Anonimizar, bloquear ou eliminar", portability: "Portabilidade",
  deletion: "Excluir dados tratados com consentimento", sharing_info: "Informação sobre compartilhamento", consent_info: "Informação sobre consentimento",
  revoke_consent: "Revogar consentimento", opposition: "Oposição", review: "Revisão de decisão automatizada", other: "Outro",
} as const;
const HOLDER_LABEL = { consumer: "Cliente de restaurante", restaurant: "Restaurante", staff: "Colaborador", other: "Outro" } as const;
// Tipos detalhados são guardados na coluna existente pelo tipo-base mais próximo; o pedido exato vai no texto.
const BASE_TYPE: Record<keyof typeof REQUEST_LABEL, "access" | "correction" | "deletion" | "revoke_consent" | "other"> = {
  access: "access", correction: "correction", anonymization: "deletion", portability: "access", deletion: "deletion",
  sharing_info: "access", consent_info: "other", revoke_consent: "revoke_consent", opposition: "other", review: "other", other: "other",
};

export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    requestType: z.enum(Object.keys(REQUEST_LABEL) as [keyof typeof REQUEST_LABEL, ...(keyof typeof REQUEST_LABEL)[]]),
    holderCategory: z.enum(["consumer", "restaurant", "staff", "other"]),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    details: z.string().trim().max(1500).optional(),
    restaurant: z.string().trim().max(120).optional(),
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    amount: z.string().trim().max(20).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { enforceRate, clientIp, logSecurityEvent } = await import("./security.server");
    await enforceRate(`privacy:${clientIp()}`, 3, 3600);
    const lines = [`Pedido: ${REQUEST_LABEL[data.requestType]}`];
    if (data.restaurant) lines.push(`Restaurante: ${data.restaurant}`);
    if (data.date) lines.push(`Data do pagamento: ${data.date}`);
    if (data.amount) lines.push(`Valor aproximado: ${data.amount}`);
    if (data.details) lines.push("", data.details);
    const details = lines.join("\n");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("privacy_requests").insert({
      request_type: BASE_TYPE[data.requestType], holder_category: data.holderCategory, name: data.name, email: data.email, details,
    }).select("id").single();
    if (error || !row) throw new Error("Não foi possível registrar a solicitação");
    const protocol = `TIPE-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    await logSecurityEvent({ action: "privacy_request", resource: data.requestType });
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("privacy-request-notification", "contato@tipe.digital", {
        templateData: { protocol, requestType: REQUEST_LABEL[data.requestType], holder: HOLDER_LABEL[data.holderCategory], name: data.name, email: data.email, details },
        idempotencyKey: `privacy-request-${row.id}`, replyTo: data.email,
      });
    } catch (e) { console.error("privacy_request_email", e); }
    return { ok: true as const, protocol };
  });

/** Verdadeiro quando o usuário já aceitou Termos para Parceiros antigos, mas não a versão vigente. */
export const getPartnerTermsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("legal_acceptances").select("version").eq("user_id", context.userId).eq("document", "partner_terms");
    const versions = (data ?? []).map((r) => r.version);
    return { needsReaccept: versions.length > 0 && !versions.includes(LEGAL.partner_terms.version), version: LEGAL.partner_terms.version };
  });
