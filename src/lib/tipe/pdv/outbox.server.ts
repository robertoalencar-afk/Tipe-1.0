// Processa a fila de baixa no PDV (chamado pela rotina /api/public/payments/reconcile).
import { getAdaptador } from "./registry.server";
import { proximoEstadoBaixa } from "./outbox";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
type Linha = { id: string; payment_id: string; restaurant_id: string; adapter: string; table_number: string; item_quantities: Record<string, number>; amount: number; payment_method: string; attempts: number };

export async function processarFilaBaixa(admin: Admin, limite = 30) {
  const { data, error } = await admin.rpc("pdv_outbox_claim" as never, { p_limit: limite } as never) as unknown as { data: Linha[] | null; error: unknown };
  if (error) return { processados: 0, erro: "leitura" };
  const resumo: Record<string, number> = {};
  const { decryptSecret } = await import("../pagarme.server");
  for (const l of data ?? []) {
    const ad = getAdaptador(l.adapter);
    const suporta = !!ad && ad.capacidades().devolvePagamento;
    let resultado: { ok: true } | { ok: false; erro: string } | null = null;
    if (suporta && ad) {
      try {
        const { data: r } = await admin.from("restaurants").select("slug").eq("id", l.restaurant_id).maybeSingle();
        const { data: c } = await admin.from("pdv_connections" as never).select("credentials_encrypted").eq("restaurant_id", l.restaurant_id).maybeSingle() as unknown as { data: { credentials_encrypted: string | null } | null };
        const credenciais = c?.credentials_encrypted ? JSON.parse(await decryptSecret(c.credentials_encrypted)) as Record<string, string> : null;
        resultado = await ad.informarPagamento(
          { restaurantId: l.restaurant_id, slug: r?.slug ?? "", credenciais },
          { mesa: l.table_number, itens: l.item_quantities ?? {}, valor: Number(l.amount), forma: l.payment_method, id: l.payment_id },
        );
      } catch (e) {
        resultado = { ok: false, erro: String((e as Error)?.message ?? "erro").slice(0, 200) };
      }
    }
    const prox = proximoEstadoBaixa({ attempts: l.attempts, suporta, resultado });
    const base = { updated_at: new Date().toISOString(), locked_until: null };
    const update = prox.status === "pending"
      ? { ...base, attempts: prox.attempts, next_attempt_at: prox.nextAttemptAt, last_error: prox.lastError }
      : prox.status === "failed"
        ? { ...base, status: "failed", attempts: prox.attempts, last_error: prox.lastError }
        : prox.status === "skipped" ? { ...base, status: "skipped", last_error: prox.motivo.slice(0, 200) } : { ...base, status: "done", last_error: null };
    await admin.from("pdv_payment_outbox" as never).update(update as never).eq("id", l.id);
    if (prox.status === "failed") {
      await admin.rpc("record_payment_incident" as never, { p_payment_id: l.payment_id, p_kind: "pdv_writeback_failed", p_detail: `Baixa não confirmada após ${prox.attempts} tentativas: ${prox.lastError}` } as never);
    }
    resumo[prox.status] = (resumo[prox.status] ?? 0) + 1;
  }
  return { processados: (data ?? []).length, resumo };
}
