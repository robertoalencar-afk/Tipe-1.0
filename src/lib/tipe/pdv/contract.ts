// Contrato universal de PDV da TIPE.
//
// As operações pedidas no plano TIPE 2.0 já existem no contrato AdaptadorPdv
// (types.ts), em português. Esta é a correspondência, para quem vier do
// vocabulário dos PDVs internacionais. São interfaces INTERNAS da TIPE: nenhuma
// delas pressupõe que um PDV externo tenha um endpoint com esse nome.
//
//   getOpenTabs()        → AdaptadorPdv.listarMesas
//   getTabDetails()      → AdaptadorPdv.buscarConta (eventos canônicos item_added…)
//   getTabBalance()      → calculado pela TIPE a partir de table_bill_items (bill-math.ts)
//   getTableStatus()     → statusMesa() em types.ts, a partir do modelo canônico
//   registerPayment()    → AdaptadorPdv.informarPagamento (só se capacidades().devolvePagamento)
//   closeTab()           → AdaptadorPdv.fecharConta (opcional)
//   getStaffMembers()    → AdaptadorPdv.listarGarcons (opcional)
//   subscribeToEvents()  → validarWebhook + receberEvento (webhook) ou sincronizar (consulta periódica)

import type { AdaptadorPdv, EventoRecebido } from "./types";

export type Problema = { regra: string; detalhe: string };

/**
 * Verificações de conformidade que todo adaptador precisa passar antes de ir
 * para o registro (registry.server.ts). Rodam com um payload de exemplo do
 * próprio sistema, sem rede.
 */
export function verificarAdaptador(adaptador: AdaptadorPdv, payloadExemplo: unknown): Problema[] {
  const problemas: Problema[] = [];
  if (!/^[a-z0-9_]{2,40}$/.test(adaptador.id)) problemas.push({ regra: "id", detalhe: "use apenas a-z, 0-9 e _" });
  const cap = adaptador.capacidades();
  if (!cap.webhook && !cap.consultaPeriodica) problemas.push({ regra: "sincronização", detalhe: "o adaptador precisa de webhook ou consulta periódica" });
  let eventos: EventoRecebido[] = [];
  try {
    eventos = adaptador.receberEvento(payloadExemplo);
  } catch (e) {
    problemas.push({ regra: "tradução", detalhe: `payload de exemplo recusado: ${(e as Error).message.slice(0, 120)}` });
    return problemas;
  }
  if (eventos.length === 0) problemas.push({ regra: "tradução", detalhe: "o payload de exemplo não gerou eventos" });
  const segunda = adaptador.receberEvento(payloadExemplo).map((e) => e.eventId);
  if (JSON.stringify(segunda) !== JSON.stringify(eventos.map((e) => e.eventId))) {
    problemas.push({ regra: "idempotência", detalhe: "o mesmo payload precisa gerar os mesmos eventId" });
  }
  if (new Set(eventos.map((e) => e.eventId)).size !== eventos.length) problemas.push({ regra: "idempotência", detalhe: "eventId repetido dentro do mesmo payload" });
  for (const { evento } of eventos) {
    if (!/^[0-9A-Za-z]{1,16}$/.test(evento.table.number)) problemas.push({ regra: "mesa", detalhe: `número de mesa inválido: ${evento.table.number}` });
    if (evento.type === "item_added" && (!(evento.item.unit_price >= 0) || !Number.isInteger(evento.item.quantity) || evento.item.quantity < 1)) {
      problemas.push({ regra: "item", detalhe: `preço ou quantidade inválidos em ${evento.item.name}` });
    }
  }
  return problemas;
}

/**
 * Espera antes de tentar de novo avisar o PDV de um pagamento (baixa).
 * Exponencial com teto de 30 min; depois de `MAX_TENTATIVAS` vira pendência
 * "pdv_writeback_failed" para baixa manual.
 */
export const MAX_TENTATIVAS = 8;
export function esperaAntesDaTentativa(tentativa: number) {
  if (tentativa < 1) return 0;
  return Math.min(30 * 60_000, 30_000 * 2 ** (tentativa - 1));
}
