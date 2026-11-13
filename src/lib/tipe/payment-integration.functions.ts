import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function authorize(
  context: Parameters<typeof import("./founder-guard").requireFounder2fa>[0],
) {
  const { requireFounder2fa } = await import("./founder-guard");
  await requireFounder2fa(context);
}

/** Somente configuração e agregados; nunca credenciais ou operações dos restaurantes. */
export const getPaymentIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await authorize(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SIMULATION_RESTAURANT_SLUGS } = await import("./pagarme.server");
    const { data, error } = await supabaseAdmin
      .from("restaurant_pagarme_accounts")
      .select("status, key_mode, restaurants!inner(slug)");
    if (error) throw new Error("Não foi possível consultar as conexões de pagamento.");
    const demo = new Set<string>(SIMULATION_RESTAURANT_SLUGS);
    const rows = (data ?? []) as unknown as Array<{
      status: string;
      key_mode: string;
      restaurants: { slug: string };
    }>;
    const key = process.env["PAGARME_SECRET_KEY"];
    return {
      platform: {
        configured: !!key,
        mode: !key ? "missing" : key.startsWith("sk_test_") ? "test" : "live",
        publicKey: !!process.env["PAGARME_PUBLIC_KEY"],
        webhook: !!process.env["PAGARME_WEBHOOK_SECRET"],
        tipRecipient: !!process.env["PAGARME_TIPE_RECIPIENT_ID"],
        googleMerchant: !!process.env["GOOGLE_PAY_MERCHANT_ID"],
      },
      restaurants: {
        live: rows.filter(
          (a) => a.status === "active" && a.key_mode === "live" && !demo.has(a.restaurants.slug),
        ).length,
        test: rows.filter(
          (a) => a.status === "active" && a.key_mode === "test" && !demo.has(a.restaurants.slug),
        ).length,
        demo: rows.filter((a) => a.status === "active" && demo.has(a.restaurants.slug)).length,
      },
    };
  });

/** Verifica autenticação no provedor sem criar cobrança ou alterar conta. */
export const validatePlatformPaymentApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await authorize(context);
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`platform-payment-check:${context.userId}`, 5, 300);
    const { pagarmeEnabled, pagarme } = await import("./pagarme.server");
    if (!pagarmeEnabled())
      throw new Error("Configure PAGARME_SECRET_KEY no ambiente de produção da Tipe.");
    let ok = false;
    try {
      await pagarme("/orders?page=1&size=1");
      ok = true;
    } catch {
      /* Não devolve resposta do provedor, pedidos ou credenciais. */
    }
    await logSecurityEvent({
      action: "platform_payment_api_checked",
      actorId: context.userId,
      resource: "pagarme",
      result: ok ? "ok" : "error",
    });
    return {
      ok,
      message: ok
        ? "A API aceitou a credencial da Tipe. Esta verificação não realiza cobrança nem comprova a habilitação de Pix ou carteiras."
        : "A API não confirmou a conexão. Confira a credencial e a disponibilidade do provedor.",
    };
  });
