import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(2).max(64).regex(/^[a-z0-9-]+$/);

async function ownerRestaurant(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id, name").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner"] });
  if (!ok) throw new Error("Somente o dono pode ver e alterar os dados de recebimento");
  return r as { id: string; name: string };
}

export const getPayoutAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await ownerRestaurant(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: a } = await supabaseAdmin.from("restaurant_payout_accounts").select("*").eq("restaurant_id", r.id).maybeSingle();
    const live = !!process.env["PAGARME_SECRET_KEY"];
    if (!a) return { live, account: null };
    return {
      live,
      account: {
        holderName: a.holder_name, holderType: a.holder_type, email: a.email, bank: a.bank, accountType: a.account_type,
        documentMasked: `•••${a.holder_document.slice(-4)}`, branch: a.branch_number, accountMasked: `•••${a.account_number.slice(-3)}-${a.account_check_digit}`,
        status: a.status, statusDetail: a.status_detail,
      },
    };
  });

const Account = z.object({
  slug: Slug,
  holderName: z.string().trim().min(3).max(120),
  holderType: z.enum(["individual", "company"]),
  holderDocument: z.string().regex(/^\d{11}$|^\d{14}$/),
  email: z.string().trim().email().max(200),
  bank: z.string().regex(/^\d{3}$/),
  branchNumber: z.string().regex(/^\d{1,4}$/),
  branchCheckDigit: z.string().regex(/^\d?$/),
  accountNumber: z.string().regex(/^\d{1,13}$/),
  accountCheckDigit: z.string().regex(/^[0-9xX]{1,2}$/),
  accountType: z.enum(["checking", "savings"]),
}).refine((v) => (v.holderType === "company") === (v.holderDocument.length === 14), { message: "Documento não corresponde ao tipo de titular" });

export const savePayoutAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Account.parse(d))
  .handler(async ({ data, context }) => {
    const r = await ownerRestaurant(context, data.slug);
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`payout:${r.id}`, 10, 3600, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin.from("restaurant_payout_accounts").select("pagarme_recipient_id").eq("restaurant_id", r.id).maybeSingle();

    const row = {
      restaurant_id: r.id, holder_name: data.holderName, holder_type: data.holderType, holder_document: data.holderDocument, email: data.email,
      bank: data.bank, branch_number: data.branchNumber, branch_check_digit: data.branchCheckDigit || null, account_number: data.accountNumber,
      account_check_digit: data.accountCheckDigit.toLowerCase(), account_type: data.accountType,
    };
    const bankAccount = {
      holder_name: data.holderName, holder_type: data.holderType, holder_document: data.holderDocument, bank: data.bank,
      branch_number: data.branchNumber, branch_check_digit: data.branchCheckDigit || undefined, account_number: data.accountNumber,
      account_check_digit: data.accountCheckDigit, type: data.accountType,
    };

    let recipientId = prev?.pagarme_recipient_id ?? null;
    let status: "pending" | "active" | "error" = "pending";
    let detail: string | null = "Recebimento digital será ativado quando a conta Pagar.me da TIPE estiver configurada.";
    const { pagarmeEnabled, pagarme } = await import("./pagarme.server");
    if (pagarmeEnabled()) {
      try {
        if (recipientId) {
          await pagarme(`/recipients/${recipientId}/default-bank-account`, { method: "PATCH", body: { bank_account: bankAccount } });
        } else {
          const rec = await pagarme<{ id: string }>("/recipients", {
            method: "POST",
            body: {
              name: data.holderName, email: data.email, document: data.holderDocument, type: data.holderType,
              default_bank_account: bankAccount,
              transfer_settings: { transfer_enabled: true, transfer_interval: "Daily", transfer_day: 0 },
              metadata: { restaurant_id: r.id },
            },
          });
          recipientId = rec.id;
        }
        status = "active"; detail = null;
      } catch (e) {
        status = "error"; detail = "O Pagar.me recusou os dados. Confira banco, agência e conta.";
        console.error("recipient", (e as Error).message);
      }
    }
    const { error } = await supabaseAdmin.from("restaurant_payout_accounts").upsert({ ...row, pagarme_recipient_id: recipientId, status, status_detail: detail });
    if (error) throw new Error("Não foi possível salvar os dados de recebimento");
    await logSecurityEvent({ action: "payout_account_saved", resource: "restaurant_payout_accounts", restaurantId: r.id, actorId: context.userId, result: status === "error" ? "error" : "ok" });
    return { status, detail };
  });
