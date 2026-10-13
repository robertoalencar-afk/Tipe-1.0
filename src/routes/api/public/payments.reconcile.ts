import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Reconciliador de pagamentos (rotina periódica, mesma autenticação de /api/public/pdv/sync).
// Recupera o que um webhook perdido deixaria preso:
//  - pedido nunca criado no provedor (queda entre reservar e cobrar): libera a reserva;
//  - pedido pendente: reconsulta o provedor e aplica a mesma decisão do webhook;
//  - pendente por tempo demais: abre uma pendência para o restaurante.
// Nunca move dinheiro; só consulta o provedor e chama funções idempotentes do banco.
// Também processa a fila de baixa no PDV (pdv_payment_outbox).
const MIN_AGE_MS = 5 * 60 * 1000;
const ORPHAN_AGE_MS = 20 * 60 * 1000;
const BATCH = 40;

export const Route = createFileRoute("/api/public/payments/reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { pagarme, restaurantPagarmeKey, pagarmeEnabled } = await import("@/lib/tipe/pagarme.server");
        const { applyProviderOrder } = await import("@/lib/tipe/payment-settlement.server");

        const before = new Date(Date.now() - MIN_AGE_MS).toISOString();
        const { data: pendentes, error } = await supabaseAdmin.from("table_payment_requests")
          .select("id, status, amount, created_at, restaurant_slug, payment_target, provider_order_id")
          .eq("status", "pending").eq("provider", "pagarme").lt("created_at", before)
          .order("created_at", { ascending: true }).limit(BATCH);
        if (error) return Response.json({ ok: false, error: "leitura" }, { status: 500 });

        const resumo: Record<string, number> = {};
        const conta = (k: string) => { resumo[k] = (resumo[k] ?? 0) + 1; };
        const chaves = new Map<string, string | null>();

        for (const p of pendentes ?? []) {
          const orderId = p.provider_order_id;
          if (!orderId) { conta("sem_pedido"); continue; }
          const idade = Date.now() - Date.parse(p.created_at);
          // A cobrança nunca chegou ao provedor: o pagamento não existe lá, então a reserva é liberada.
          if (orderId.startsWith("local_")) {
            if (idade < ORPHAN_AGE_MS) { conta("aguardando"); continue; }
            await supabaseAdmin.rpc("provider_settle_payment" as never, { p_order_id: orderId, p_paid: false } as never);
            conta("reserva_liberada");
            continue;
          }
          try {
            let secretKey: string | undefined;
            if (p.payment_target === "restaurant") {
              if (!chaves.has(p.restaurant_slug)) {
                const { data: r } = await supabaseAdmin.from("restaurants").select("id").eq("slug", p.restaurant_slug).maybeSingle();
                chaves.set(p.restaurant_slug, r ? await restaurantPagarmeKey(r.id) : null);
              }
              secretKey = chaves.get(p.restaurant_slug) ?? undefined;
              if (!secretKey) { conta("sem_credencial"); continue; }
            } else if (!pagarmeEnabled()) { conta("sem_credencial"); continue; }
            const order = await pagarme<import("@/lib/tipe/pagarme.server").PagarmeOrder>(`/orders/${orderId}`, secretKey ? { secretKey } : {});
            const acao = await applyProviderOrder(supabaseAdmin, orderId, order, {
              ...p, amount: Number(p.amount), status: "pending", archived: false,
            });
            conta(acao);
          } catch {
            conta("erro_provedor");
          }
        }
        // Mesma rotina: baixa dos pagamentos aprovados no PDV externo do restaurante.
        const { processarFilaBaixa } = await import("@/lib/tipe/pdv/outbox.server");
        const baixa = await processarFilaBaixa(supabaseAdmin);
        return Response.json({ ok: true, verificados: (pendentes ?? []).length, resumo, baixaPdv: baixa });
      },
    },
  },
});
