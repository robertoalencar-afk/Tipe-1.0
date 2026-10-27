/**
 * "O que precisa de você agora" no Início do painel do restaurante.
 * Junta, em uma fila só e por ordem de urgência, o que hoje fica espalhado
 * entre Caixa, Salão, Integrações e Garçons.
 */

export type TarefaAgora = {
  id: string;
  tipo: "pendencia" | "confirmar" | "sincronizacao" | "cancelamento" | "quitada" | "nota";
  /** 0 = dinheiro em risco, 1 = cliente ou mesa esperando, 2 = vale olhar hoje. */
  urgencia: 0 | 1 | 2;
  titulo: string;
  detalhe: string;
  acao: string;
  destino: { aba: string } | { mesa: string };
  pagamentoId?: string;
  desde?: string;
};

export type EntradaAgora = {
  incidentes: number;
  pendentes: {
    id: string;
    table_number: string;
    customer_name: string;
    amount: number;
    created_at: string;
    establishment_method: string | null;
    cash_received: number | null;
    change_due: number | null;
  }[];
  syncErro: boolean;
  alertasCancelamento: { id: string; detail: string | null; created_at: string }[];
  quitadas: { number: string; total: number }[];
  notas: { stars: number; comment: string; table: string; at: string; garcom: string }[];
  agora: Date;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const DIA = 86_400_000;

export function haQuanto(desde: string, agora: Date): string {
  const min = Math.max(0, Math.floor((agora.getTime() - new Date(desde).getTime()) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} d`;
}

export function tarefasAgora(e: EntradaAgora): TarefaAgora[] {
  const t: TarefaAgora[] = [];
  const recente = (s: string) => e.agora.getTime() - new Date(s).getTime() < DIA;

  if (e.incidentes > 0)
    t.push({
      id: "pendencias",
      tipo: "pendencia",
      urgencia: 0,
      titulo:
        e.incidentes === 1 ? "1 pendência financeira" : `${e.incidentes} pendências financeiras`,
      detalhe: "Estorno, contestação ou baixa que não chegou ao seu sistema.",
      acao: "Resolver no caixa",
      destino: { aba: "caixa" },
    });

  for (const p of [...e.pendentes].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const forma =
      p.establishment_method === "cash"
        ? `Dinheiro${p.change_due ? `, troco de ${brl(p.change_due)}` : ""}`
        : p.establishment_method === "card_terminal"
          ? "Maquininha"
          : "No local";
    t.push({
      id: `pag-${p.id}`,
      tipo: "confirmar",
      urgencia: 1,
      titulo: `Mesa ${p.table_number} · confirmar ${brl(p.amount)}`,
      detalhe: `${p.customer_name} · ${forma} · ${haQuanto(p.created_at, e.agora)}`,
      acao: "Confirmar recebimento",
      destino: { mesa: p.table_number },
      pagamentoId: p.id,
      desde: p.created_at,
    });
  }

  if (e.syncErro)
    t.push({
      id: "sync",
      tipo: "sincronizacao",
      urgencia: 0,
      titulo: "Seu sistema parou de sincronizar",
      detalhe: "Lance os pedidos pelo Lançamento TIPE até a integração voltar.",
      acao: "Ver integração",
      destino: { aba: "integracoes" },
    });

  const cancel = e.alertasCancelamento.filter((a) => recente(a.created_at));
  if (cancel[0])
    t.push({
      id: `cancel-${cancel[0].id}`,
      tipo: "cancelamento",
      urgencia: 0,
      titulo:
        cancel.length === 1
          ? "Cancelamento bloqueado no seu sistema"
          : `${cancel.length} cancelamentos bloqueados no seu sistema`,
      detalhe: cancel[0].detail ?? "Um item pago não pode ser cancelado no PDV.",
      acao: "Ver histórico",
      destino: { aba: "historico" },
      desde: cancel[0].created_at,
    });

  for (const m of e.quitadas)
    t.push({
      id: `quitada-${m.number}`,
      tipo: "quitada",
      urgencia: 2,
      titulo: `Mesa ${m.number} paga por completo`,
      detalhe: `Conta de ${brl(m.total)} quitada. Feche e libere a mesa para o próximo cliente.`,
      acao: "Abrir mesa",
      destino: { mesa: m.number },
    });

  for (const [i, n] of e.notas.filter((x) => x.stars <= 2 && recente(x.at)).entries())
    t.push({
      id: `nota-${i}-${n.table}-${n.at}`,
      tipo: "nota",
      urgencia: 2,
      titulo: `Nota ${n.stars} na mesa ${n.table}`,
      detalhe: `${n.garcom}: “${n.comment}”`,
      acao: "Ver avaliações",
      destino: { aba: "garcons" },
      desde: n.at,
    });

  return t
    .map((x, i) => ({ x, i }))
    .sort((a, b) => a.x.urgencia - b.x.urgencia || a.i - b.i)
    .map(({ x }) => x);
}
