import type { AdaptadorPdv, EventoRecebido } from "./types";
import { lancamentoTipe } from "./adapters/lancamento-tipe.server";
import { apiTipe } from "./adapters/api-tipe.server";

// Registro dos adaptadores ativos. Para adicionar um sistema novo, crie o
// adaptador a partir de adapters/_modelo.server.ts e inclua aqui.
const ADAPTADORES: Record<string, AdaptadorPdv> = {
  [lancamentoTipe.id]: lancamentoTipe,
  [apiTipe.id]: apiTipe,
};

export const getAdaptador = (id: string) => ADAPTADORES[id] ?? null;
export const listarAdaptadores = () => Object.values(ADAPTADORES);

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Aplica eventos canônicos de forma idempotente e atualiza o status da conexão. */
export async function aplicarEventos(admin: Admin, restaurantId: string, adapter: string, eventos: EventoRecebido[]) {
  const resultados: { eventId: string; result: string }[] = [];
  for (const e of eventos) {
    const { data, error } = await admin.rpc("pdv_ingest_event" as never, { p_restaurant: restaurantId, p_adapter: adapter, p_event_id: e.eventId, p_event: e.evento } as never);
    const result = error ? "error:falha interna" : String(data);
    resultados.push({ eventId: e.eventId, result });
    if (result.includes("já pago ou reservado") && e.evento.type === "item_cancelled") {
      const item = e.evento.item.name || e.evento.item.code || "Item";
      await admin.from("pdv_events" as never).update({
        detail: `O item ${item} foi cancelado no seu sistema, mas já foi pago pela TIPE. Verifique com o cliente.`,
      } as never).eq("restaurant_id", restaurantId).eq("adapter", adapter).eq("external_event_id", e.eventId);
    }
  }
  const erro = resultados.find((r) => r.result.startsWith("error:"));
  await admin.from("pdv_connections" as never).update((erro
    ? { status: "error", last_error: erro.result.slice(6, 200), last_error_at: new Date().toISOString(), last_sync_at: new Date().toISOString() }
    : { status: "connected", last_error: null, last_sync_at: new Date().toISOString() }) as never).eq("restaurant_id", restaurantId);
  return resultados;
}
