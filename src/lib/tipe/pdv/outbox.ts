// Política da fila de baixa no PDV (pdv_payment_outbox).
import { esperaAntesDaTentativa, MAX_TENTATIVAS } from "./contract";

export type EstadoBaixa =
  | { status: "done" }
  | { status: "skipped"; motivo: string }
  | { status: "pending"; attempts: number; nextAttemptAt: string; lastError: string }
  | { status: "failed"; attempts: number; lastError: string };

/**
 * Decide o próximo estado de um item da fila depois de uma tentativa.
 * `suporta` = o adaptador existe e declara devolvePagamento.
 */
export function proximoEstadoBaixa(input: { attempts: number; suporta: boolean; resultado: { ok: true } | { ok: false; erro: string } | null; agora?: number }): EstadoBaixa {
  if (!input.suporta) return { status: "skipped", motivo: "O sistema do restaurante não aceita baixa automática" };
  const r = input.resultado;
  if (r?.ok) return { status: "done" };
  const attempts = input.attempts + 1;
  const lastError = (r && !r.ok ? r.erro : "Sem resposta do sistema do restaurante").slice(0, 200);
  if (attempts >= MAX_TENTATIVAS) return { status: "failed", attempts, lastError };
  const agora = input.agora ?? Date.now();
  return { status: "pending", attempts, nextAttemptAt: new Date(agora + esperaAntesDaTentativa(attempts)).toISOString(), lastError };
}
